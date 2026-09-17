// T1–T4 und T6: Statuswechsel, die Version, Hülle und Ereignis zusammen schreiben. T5 (Freigabe)
// und T7 (Überarbeiten) stehen getrennt, weil sie mehr tun als den Status zu setzen.
import {
    canApproveContent,
    canApproveFormal,
    canAssignAuthor,
    canSubmit,
    isComplete,
    type SessionUser,
} from '@app/domain';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { areas, processes, processVersions, users } from '../db/schema/index.js';
import { badRequest, notFound } from '../http/errors.js';
import { assertAllowed, assertTransition, lockTarget, mailOf, qmRecipients, type Tx } from './context.js';
import { writeEvent } from './events.js';
import { TRANSITIONS, type TransitionName } from './transitions.js';

export interface TransitionResult {
    readonly status: string;
    readonly toast: string;
}

async function areaProcessOwnerMail(tx: Tx, areaId: string): Promise<string | null> {
    const [row] = await tx
        .select({ mail: users.mail })
        .from(areas)
        .leftJoin(users, eq(users.id, areas.processOwnerId))
        .where(eq(areas.id, areaId))
        .limit(1);
    return row?.mail ?? null;
}

interface Move {
    readonly name: TransitionName;
    readonly processId: string;
    readonly actor: SessionUser;
    readonly comment?: string | null;
    readonly plan: (target: Awaited<ReturnType<typeof lockTarget>>, tx: Tx) => Promise<MovePlan>;
}

async function applyMove({ name, processId, actor, comment = null, plan }: Move): Promise<TransitionResult> {
    const transition = TRANSITIONS[name];

    return db.transaction(async (tx) => {
        const target = await lockTarget(tx, processId);
        assertTransition(name, target.version.status as never, comment);
        const { versionPatch, shellPatch, recipients } = await plan(target, tx);

        await tx
            .update(processVersions)
            .set({
                status: transition.to,
                ...(transition.clearsSignOff ? { submittedAt: null, contentReviewedAt: null } : {}),
                ...versionPatch,
                updatedAt: new Date(),
            })
            .where(eq(processVersions.id, target.version.id));

        await tx
            .update(processes)
            .set({ status: transition.to, ...shellPatch })
            .where(eq(processes.id, processId));

        await writeEvent(
            tx,
            {
                processId,
                processVersionId: target.version.id,
                eventKind: transition.eventKind,
                newStatus: transition.to,
                actorId: actor.id,
                comment,
            },
            recipients,
        );

        return { status: transition.to, toast: transition.toast };
    });
}

interface MovePlan {
    readonly versionPatch?: Record<string, unknown>;
    readonly shellPatch?: Record<string, unknown>;
    readonly recipients: readonly (string | null)[];
}

export async function assignAuthor(
    user: SessionUser,
    processId: string,
    authorId: string,
): Promise<TransitionResult> {
    return applyMove({ name: 'assign-author', processId, actor: user, plan: async ({ process }, tx) => {
        assertAllowed(
            canAssignAuthor(user, {
                status: process.status as never,
                area: { id: process.areaId },
                author: process.authorId === null ? null : { id: process.authorId },
            }),
        );

        const [author] = await tx
            .select({ id: users.id, mail: users.mail })
            .from(users)
            .where(and(eq(users.id, authorId), eq(users.isActive, true)))
            .limit(1);
        if (!author) throw notFound('Verfasser nicht gefunden.');

        return {
            versionPatch: { authorId },
            shellPatch: { authorId },
            recipients: [author.mail],
        };
    } });
}

export async function submitForReview(user: SessionUser, processId: string): Promise<TransitionResult> {
    return applyMove({ name: 'submit', processId, actor: user, plan: async ({ process, version }, tx) => {
        assertAllowed(
            canSubmit(user, {
                status: version.status as never,
                author: version.authorId === null ? null : { id: version.authorId },
            }),
        );
        if (!isComplete({ ...version, descriptionDoc: null }, process.templateType as never)) {
            throw badRequest('Bitte zuerst alle Pflichtangaben ausfüllen.');
        }

        return {
            versionPatch: { submittedAt: new Date() },
            recipients: [await areaProcessOwnerMail(tx, process.areaId)],
        };
    } });
}

export async function approveContent(user: SessionUser, processId: string): Promise<TransitionResult> {
    return applyMove({ name: 'approve-content', processId, actor: user, plan: async ({ process, version }, tx) => {
        assertAllowed(
            canApproveContent(
                user,
                { status: process.status as never, area: { id: process.areaId }, author: null },
                { status: version.status as never, author: null },
            ),
        );

        return {
            versionPatch: { contentReviewedAt: new Date(), processOwnerId: user.id },
            recipients: await qmRecipients(tx),
        };
    } });
}

export async function rejectContent(
    user: SessionUser,
    processId: string,
    comment: string,
): Promise<TransitionResult> {
    return applyMove({ name: 'reject-content', processId, actor: user, comment, plan: async ({ process, version }, tx) => {
        assertAllowed(
            canApproveContent(
                user,
                { status: process.status as never, area: { id: process.areaId }, author: null },
                { status: version.status as never, author: null },
            ),
        );
        return { recipients: [await mailOf(tx, version.authorId)] };
    } });
}

export async function rejectFormal(
    user: SessionUser,
    processId: string,
    comment: string,
): Promise<TransitionResult> {
    return applyMove({ name: 'reject-formal', processId, actor: user, comment, plan: async ({ version }, tx) => {
        assertAllowed(canApproveFormal(user, { status: version.status as never, author: null }));
        return { recipients: [await mailOf(tx, version.authorId)] };
    } });
}
