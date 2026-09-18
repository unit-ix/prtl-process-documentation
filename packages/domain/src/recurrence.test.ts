import { describe, expect, it } from 'vitest';
import { isDueForNextRound, nextRound, RECURRENCE_LEAD_DAYS } from './recurrence.js';

describe('nextRound — Abstände', () => {
    it('rechnet vierteljährlich, halbjährlich und jährlich ab dem Abschlusstag', () => {
        expect(nextRound('Vierteljährlich', '2026-03-14')?.dueDate).toBe('2026-06-14');
        expect(nextRound('Halbjährlich', '2026-03-14')?.dueDate).toBe('2026-09-14');
        expect(nextRound('Jährlich', '2026-03-14')?.dueDate).toBe('2027-03-14');
    });

    it('gibt ohne Wiederholung nichts zurück', () => {
        expect(nextRound('Keine Wiederholung', '2026-03-14')).toBeNull();
    });

    it('öffnet die Runde 14 Tage vor der Frist', () => {
        const round = nextRound('Jährlich', '2026-03-14');
        expect(round?.opensOn).toBe('2027-02-28');
        expect(RECURRENCE_LEAD_DAYS).toBe(14);
    });
});

describe('nextRound — Kalender-Fallen', () => {
    // 31.01. + 1 Monat gibt es nicht. Ohne Begrenzung landet man im März.
    it('rutscht vom Monatsende nicht in den Folgemonat', () => {
        expect(nextRound('Vierteljährlich', '2026-05-31')?.dueDate).toBe('2026-08-31');
        expect(nextRound('Halbjährlich', '2026-08-31')?.dueDate).toBe('2027-02-28');
    });

    it('trifft den 29. Februar im Schaltjahr', () => {
        expect(nextRound('Jährlich', '2027-02-28')?.dueDate).toBe('2028-02-28');
        expect(nextRound('Vierteljährlich', '2027-11-29')?.dueDate).toBe('2028-02-29');
    });

    it('rechnet über den Jahreswechsel', () => {
        expect(nextRound('Vierteljährlich', '2026-11-15')?.dueDate).toBe('2027-02-15');
    });
});

describe('isDueForNextRound', () => {
    const offen = { recurrence: 'Jährlich' as const, completedOn: null, hasSuccessor: false };
    const fertig = { recurrence: 'Jährlich' as const, completedOn: '2026-03-14', hasSuccessor: false };

    it('öffnet nichts, solange noch jemand offen ist', () => {
        expect(isDueForNextRound(offen, '2030-01-01')).toBeNull();
    });

    it('öffnet nichts vor dem Vorlauf', () => {
        expect(isDueForNextRound(fertig, '2027-02-27')).toBeNull();
    });

    it('öffnet am ersten Tag des Vorlaufs', () => {
        expect(isDueForNextRound(fertig, '2027-02-28')?.dueDate).toBe('2027-03-14');
    });

    it('öffnet auch verspätet noch — ein verpasster Tick geht nicht verloren', () => {
        expect(isDueForNextRound(fertig, '2027-08-01')?.dueDate).toBe('2027-03-14');
    });

    // Der Schutz gegen doppelte Runden: existiert schon eine Nachfolgerin, passiert nichts mehr.
    it('öffnet keine zweite Folgerunde', () => {
        expect(isDueForNextRound({ ...fertig, hasSuccessor: true }, '2030-01-01')).toBeNull();
    });

    it('öffnet nichts ohne Wiederholung', () => {
        expect(isDueForNextRound({ ...fertig, recurrence: 'Keine Wiederholung' }, '2030-01-01')).toBeNull();
    });
});
