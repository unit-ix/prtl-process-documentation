import type { ProcessStatus, SessionUser } from '@app/domain';
import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { processes, processVersions, users, type ProcessRow, type ProcessVersionRow } from '../db/schema/index.js';
import { badRequest, forbidden, notFound } from '../http/errors.js';
import { TRANSITIONS, type TransitionName } from './transitions.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface WorkflowTarget {
    readonly process: ProcessRow;
    readonly version: ProcessVersionRow;
}

/** Sperrt Hülle und aktuelle Ausgabe für die Dauer der Transaktion (§5.3, Rennen bei der Freigabe). */
export async function lockTarget(tx: Tx, processId: string): Promise<WorkflowTarget> {
    const [process] = await tx
        .select()
        .from(processes)
        .where(and(eq(processes.id, processId), eq(processes.isActive, true)))
        .limit(1)
        .for('update');
    if (!process) throw notFound('Prozess nicht gefunden.');
    if (process.currentVersionId === null) throw badRequest('Der Prozess hat keine aktuelle Ausgabe.');

    const [version] = await tx
        .select()
        .from(processVersions)
        .where(eq(processVersions.id, process.currentVersionId))
        .limit(1)
        .for('update');
    if (!version) throw notFound('Aktuelle Ausgabe nicht gefunden.');

    return { process, version };
}

export function assertTransition(name: TransitionName, status: ProcessStatus, comment: string | null): void {
    const transition = TRANSITIONS[name];
    if (!transition.from.includes(status)) {
        throw badRequest(`Dieser Schritt ist im Status "${status}" nicht möglich.`);
    }
    if (transition.requiresComment && (comment ?? '').trim() === '') {
        throw badRequest('Bitte einen Grund angeben.');
    }
}

export function assertAllowed(allowed: boolean): void {
    if (!allowed) throw forbidden('Für diesen Schritt fehlt die Berechtigung.');
}

export async function mailOf(tx: Tx, userId: string | null): Promise<string | null> {
    if (userId === null) return null;
    const [row] = await tx.select({ mail: users.mail }).from(users).where(eq(users.id, userId)).limit(1);
    return row?.mail ?? null;
}

/** Empfänger der Mail an das QM (§7.6): alle aktiven QM-Konten, ersatzweise die Administratoren. */
export async function qmRecipients(tx: Tx): Promise<string[]> {
    const mailsWhere = async (condition: SQL) => {
        const rows = await tx.select({ mail: users.mail }).from(users).where(condition);
        return rows.map((row) => row.mail).filter((mail): mail is string => mail !== null);
    };

    const qm = await mailsWhere(and(eq(users.isQm, true), eq(users.isActive, true)) as SQL);
    if (qm.length > 0) return qm;

    return mailsWhere(and(eq(users.isAdministrator, true), eq(users.isActive, true)) as SQL);
}

export interface EventInput {
    readonly processId: string;
    readonly processVersionId: string;
    readonly eventKind: (typeof TRANSITIONS)[TransitionName]['eventKind'];
    readonly newStatus: ProcessStatus;
    readonly actorId: string;
    readonly comment?: string | null;
    readonly recipients: readonly (string | null)[];
}

export const actorId = (user: SessionUser): string => user.id;
