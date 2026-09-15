// T7 — "Überarbeiten". §5.5: die freigegebene Ausgabe bleibt live und lesbar, daneben entsteht ein
// Klon als Entwurf. Zusatzfelder und Verknüpfungen wandern mit, Dokumente nicht: die hängen am
// Prozess, nicht an der Ausgabe.
import { canReopen, type SessionUser } from '@app/domain';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { processAdditionalFields, processes, processLinks, processVersions } from '../db/schema/index.js';
import { badRequest, notFound } from '../http/errors.js';
import { assertAllowed, lockTarget, type Tx } from './context.js';
import { writeEvent } from './events.js';
import { TRANSITIONS } from './transitions.js';

export const reopenSchema = z.object({ changeReason: z.string().trim().max(4000).nullish() }).strict();

async function cloneChildren(tx: Tx, sourceVersionId: string, draftId: string): Promise<void> {
    const [fields, links] = await Promise.all([
        tx
            .select()
            .from(processAdditionalFields)
            .where(
                and(
                    eq(processAdditionalFields.processVersionId, sourceVersionId),
                    eq(processAdditionalFields.isActive, true),
                ),
            ),
        tx
            .select()
            .from(processLinks)
            .where(and(eq(processLinks.processVersionId, sourceVersionId), eq(processLinks.isActive, true))),
    ]);

    if (fields.length > 0) {
        await tx.insert(processAdditionalFields).values(
            fields.map((field) => ({
                processVersionId: draftId,
                title: field.title,
                value: field.value,
                sortOrder: field.sortOrder,
            })),
        );
    }

    if (links.length > 0) {
        await tx.insert(processLinks).values(
            links.map((link) => ({
                processVersionId: draftId,
                linkType: link.linkType,
                linkedProcessId: link.linkedProcessId,
                title: link.title,
                url: link.url,
            })),
        );
    }
}

type ReleasedRow = typeof processVersions.$inferSelect;

const draftFrom = (released: ReleasedRow, changeReason: string | null) => ({
    processId: released.processId,
    status: 'in_capture',
    edition: null,
    authorId: released.authorId,
    changeReason,
    purpose: released.purpose,
    scopeDetail: released.scopeDetail,
    terms: released.terms,
    descriptionDoc: released.descriptionDoc,
    descriptionText: released.descriptionText,
    responsibilities: released.responsibilities,
    workSequence: released.workSequence,
    method: released.method,
    processParameters: released.processParameters,
    documentationRef: released.documentationRef,
    deviationHandling: released.deviationHandling,
    maintenanceRef: released.maintenanceRef,
});

export async function reopenForRevision(user: SessionUser, processId: string, changeReason: string | null) {
    const transition = TRANSITIONS.reopen;

    return db.transaction(async (tx) => {
        const { process } = await lockTarget(tx, processId);
        if (process.hasActiveDraft) throw badRequest('Für diesen Prozess ist bereits eine Ausgabe in Bearbeitung.');

        const [released] = await tx
            .select()
            .from(processVersions)
            .where(and(eq(processVersions.processId, processId), isNotNull(processVersions.edition)))
            .orderBy(desc(processVersions.edition))
            .limit(1)
            .for('update');
        if (!released) throw notFound('Es gibt keine freigegebene Ausgabe, die überarbeitet werden könnte.');

        assertAllowed(
            canReopen(
                user,
                {
                    status: process.status as never,
                    area: { id: process.areaId },
                    author: process.authorId === null ? null : { id: process.authorId },
                },
                {
                    status: released.status as never,
                    author: released.authorId === null ? null : { id: released.authorId },
                },
            ),
        );

        const [draft] = await tx.insert(processVersions).values(draftFrom(released, changeReason)).returning({
            id: processVersions.id,
        });

        await cloneChildren(tx, released.id, draft.id);

        await tx
            .update(processes)
            .set({ status: 'in_capture', hasActiveDraft: true, currentVersionId: draft.id })
            .where(eq(processes.id, processId));

        await writeEvent(tx, {
            processId,
            processVersionId: draft.id,
            eventKind: transition.eventKind,
            newStatus: 'in_capture',
            actorId: user.id,
        });

        return { status: 'in_capture', versionId: draft.id, toast: transition.toast };
    });
}
