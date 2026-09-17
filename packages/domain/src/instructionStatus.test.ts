import { describe, expect, it } from 'vitest';
import { countParticipants, defaultDueDate, instructionStatus } from './instructionStatus.js';
import type { ParticipantStatus } from './enums.js';

const people = (...statuses: ParticipantStatus[]) => statuses.map((status) => ({ status }));

describe('countParticipants', () => {
    it('zählt bestätigt, abgelehnt und offen', () => {
        expect(countParticipants(people('Bestätigt', 'Abgelehnt', 'Offen', 'Offen'))).toEqual({
            total: 4,
            confirmed: 1,
            declined: 1,
            open: 2,
        });
    });

    it('kommt mit einer leeren Liste zurecht', () => {
        expect(countParticipants([])).toEqual({ total: 0, confirmed: 0, declined: 0, open: 0 });
    });
});

describe('instructionStatus', () => {
    const on = (...statuses: ParticipantStatus[]) => countParticipants(people(...statuses));

    it('ist abgeschlossen, wenn ALLE bestätigt haben', () => {
        expect(instructionStatus(on('Bestätigt', 'Bestätigt'), '2026-01-01', '2026-09-15')).toBe('Abgeschlossen');
    });

    it('ist überfällig, wenn die Frist vorbei ist und noch jemand offen ist', () => {
        expect(instructionStatus(on('Bestätigt', 'Offen'), '2026-09-14', '2026-09-15')).toBe('Überfällig');
    });

    it('ist am Tag der Frist noch offen, nicht überfällig', () => {
        expect(instructionStatus(on('Offen'), '2026-09-15', '2026-09-15')).toBe('Offen');
    });

    it('ist ohne Frist nie überfällig', () => {
        expect(instructionStatus(on('Offen'), null, '2026-09-15')).toBe('Offen');
    });

    it('zählt eine Ablehnung nicht als Erledigung', () => {
        expect(instructionStatus(on('Bestätigt', 'Abgelehnt'), '2026-09-14', '2026-09-15')).toBe('Überfällig');
    });

    it('ist ohne Teilnehmer offen, nicht abgeschlossen', () => {
        expect(instructionStatus(on(), null, '2026-09-15')).toBe('Offen');
    });
});

describe('defaultDueDate', () => {
    it('liegt 14 Tage nach heute', () => {
        expect(defaultDueDate('2026-09-15')).toBe('2026-09-29');
    });

    it('rechnet über Monats- und Jahresgrenzen', () => {
        expect(defaultDueDate('2026-12-25')).toBe('2027-01-08');
        expect(defaultDueDate('2028-02-20')).toBe('2028-03-05');
    });
});
