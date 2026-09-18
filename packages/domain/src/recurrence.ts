// §7.8 — wiederkehrende Unterweisungen. Canvas speichert den Turnus und liest ihn nie wieder;
// hier öffnet er tatsächlich die nächste Runde.
//
// Gerechnet wird ab dem Tag, an dem ALLE bestätigt haben, nicht ab der geplanten Frist: für ein
// Audit zählt der Abstand zwischen den tatsächlichen Unterweisungen. Wer nie fertig geworden ist,
// bekommt keine neue Runde — die alte bleibt überfällig stehen, statt sich zu stapeln.
import type { Recurrence } from './enums.js';

const MONTHS: Readonly<Record<Recurrence, number | null>> = {
    'Keine Wiederholung': null,
    Vierteljährlich: 3,
    Halbjährlich: 6,
    Jährlich: 12,
};

/** Vorlauf: die Folgerunde öffnet vor der Frist, damit sie auch erledigt werden kann. */
export const RECURRENCE_LEAD_DAYS = 14;

const addMonths = (isoDate: string, months: number): string => {
    const date = new Date(`${isoDate}T00:00:00.000Z`);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months);
    // 31.01. + 1 Monat gibt es nicht — auf den letzten Tag des Zielmonats begrenzen statt in den
    // Folgemonat zu rutschen.
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.toISOString().slice(0, 10);
};

const addDays = (isoDate: string, days: number): string => {
    const date = new Date(`${isoDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

export interface NextRound {
    /** Frist der Folgerunde. */
    readonly dueDate: string;
    /** Ab diesem Tag wird sie angelegt und verschickt. */
    readonly opensOn: string;
}

export function nextRound(recurrence: Recurrence, completedOn: string): NextRound | null {
    const months = MONTHS[recurrence];
    if (months === null) return null;

    const dueDate = addMonths(completedOn, months);
    return { dueDate, opensOn: addDays(dueDate, -RECURRENCE_LEAD_DAYS) };
}

export interface RoundCandidate {
    readonly recurrence: Recurrence;
    /** Tag, an dem der letzte Teilnehmer bestätigt hat — null, solange jemand offen ist. */
    readonly completedOn: string | null;
    /** true = für diese Runde existiert bereits eine Folgerunde. */
    readonly hasSuccessor: boolean;
}

export function isDueForNextRound(candidate: RoundCandidate, today: string): NextRound | null {
    if (candidate.hasSuccessor || candidate.completedOn === null) return null;

    const round = nextRound(candidate.recurrence, candidate.completedOn);
    if (round === null || today < round.opensOn) return null;
    return round;
}
