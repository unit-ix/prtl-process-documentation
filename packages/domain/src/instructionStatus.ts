// §7.2 — der Status einer Unterweisung wird NIE gespeichert. Canvas speichert ihn und schreibt ihn
// nur auf einem von drei Bestätigungswegen fort, der Wert driftet also (§12, Defekt 7).
import type { InstructionStatus, ParticipantStatus } from './enums.js';

export interface ParticipantCounts {
    readonly total: number;
    readonly confirmed: number;
    readonly declined: number;
    readonly open: number;
}

export function countParticipants(
    participants: readonly { status: ParticipantStatus }[],
): ParticipantCounts {
    const confirmed = participants.filter((p) => p.status === 'Bestätigt').length;
    const declined = participants.filter((p) => p.status === 'Abgelehnt').length;
    return {
        total: participants.length,
        confirmed,
        declined,
        open: participants.length - confirmed - declined,
    };
}

/** `today` kommt herein, nie aus der Uhr im Innern — sonst ist der Test nur heute grün. */
export function instructionStatus(
    counts: ParticipantCounts,
    dueDate: string | null,
    today: string,
): InstructionStatus {
    if (counts.total > 0 && counts.confirmed === counts.total) return 'Abgeschlossen';
    if (dueDate !== null && dueDate < today && counts.confirmed < counts.total) return 'Überfällig';
    return 'Offen';
}

export const DEFAULT_DUE_DAYS = 14;

export function defaultDueDate(today: string): string {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + DEFAULT_DUE_DAYS);
    return date.toISOString().slice(0, 10);
}
