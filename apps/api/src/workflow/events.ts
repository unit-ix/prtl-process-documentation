import type { EventKind, ProcessStatus } from '@app/domain';
import { processEvents } from '../db/schema/index.js';
import type { Tx } from './context.js';

export interface EventRow {
    readonly processId: string;
    readonly processVersionId: string | null;
    readonly eventKind: EventKind;
    readonly newStatus: ProcessStatus;
    readonly actorId: string;
    readonly comment?: string | null;
}

// Eine Zeile je Empfänger: der Versand-Sweep arbeitet Zeilen ab, und isSent/sentAt/sendError sind
// pro Adresse nachvollziehbar (§7.6). Ohne Empfänger bleibt trotzdem die Audit-Zeile stehen.
export async function writeEvent(
    tx: Tx,
    event: EventRow,
    recipients: readonly (string | null)[] = [],
): Promise<void> {
    const mails = [...new Set(recipients.filter((mail): mail is string => (mail ?? '').trim() !== ''))];
    const base = {
        processId: event.processId,
        processVersionId: event.processVersionId,
        eventKind: event.eventKind,
        newStatus: event.newStatus,
        actorId: event.actorId,
        comment: event.comment ?? null,
    };

    const rows = mails.length === 0 ? [{ ...base, recipientEmail: null }] : mails.map((mail) => ({ ...base, recipientEmail: mail }));
    await tx.insert(processEvents).values(rows);
}
