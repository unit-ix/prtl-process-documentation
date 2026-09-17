import { PROCESS_STATUSES, type ProcessStatus } from '@app/domain';
import { describe, expect, it } from 'vitest';
import { isAllowedFrom, TRANSITIONS, type TransitionName } from './transitions.js';

const names = Object.keys(TRANSITIONS) as TransitionName[];

describe('Übergangstabelle', () => {
    it('kennt genau die sieben Übergänge aus §4', () => {
        expect(names.sort()).toEqual(
            ['approve-content', 'approve-formal', 'assign-author', 'reject-content', 'reject-formal', 'reopen', 'submit'].sort(),
        );
    });

    it('bildet den Weg durch die Kette ab', () => {
        expect(TRANSITIONS['assign-author']).toMatchObject({ from: ['backlog'], to: 'in_capture' });
        expect(TRANSITIONS.submit).toMatchObject({ from: ['in_capture'], to: 'content_review' });
        expect(TRANSITIONS['approve-content']).toMatchObject({ from: ['content_review'], to: 'formal_review' });
        expect(TRANSITIONS['approve-formal']).toMatchObject({ from: ['formal_review'], to: 'approved' });
    });

    // §1 Idee 3: Ablehnen ist ein Ereignis, kein Status. Beide Wege enden in in_capture.
    it('führt beide Ablehnungen nach in_capture zurück', () => {
        expect(TRANSITIONS['reject-content'].to).toBe('in_capture');
        expect(TRANSITIONS['reject-formal'].to).toBe('in_capture');
    });

    it('verlangt bei beiden Ablehnungen eine Begründung, sonst nie', () => {
        const withComment = names.filter((name) => TRANSITIONS[name].requiresComment);
        expect(withComment.sort()).toEqual(['reject-content', 'reject-formal']);
    });

    // Defekt 12: Canvas lässt die Zeitstempel stehen, das Genehmigungsverzeichnis zeigt dann
    // Unterschriften aus einer überholten Runde.
    it('räumt die Freigabe-Zeitstempel genau bei den Ablehnungen', () => {
        const clearing = names.filter((name) => TRANSITIONS[name].clearsSignOff);
        expect(clearing.sort()).toEqual(['reject-content', 'reject-formal']);
    });

    it('benutzt jede Ereignisart genau einmal', () => {
        const kinds = names.map((name) => TRANSITIONS[name].eventKind);
        expect(new Set(kinds).size).toBe(kinds.length);
    });

    it('kennt keinen Status ausserhalb der fünf', () => {
        const used = names.flatMap((name) => [...TRANSITIONS[name].from, TRANSITIONS[name].to]);
        for (const status of used) expect(PROCESS_STATUSES).toContain(status);
    });
});

describe('isAllowedFrom', () => {
    it('lässt nur den vorgesehenen Ausgangsstatus zu', () => {
        expect(isAllowedFrom('submit', 'in_capture')).toBe(true);
        const others = PROCESS_STATUSES.filter((status) => status !== 'in_capture') as ProcessStatus[];
        for (const status of others) expect(isAllowedFrom('submit', status)).toBe(false);
    });

    it('lässt eine Freigabe nur aus der formellen Prüfung zu', () => {
        expect(isAllowedFrom('approve-formal', 'formal_review')).toBe(true);
        expect(isAllowedFrom('approve-formal', 'content_review')).toBe(false);
        expect(isAllowedFrom('approve-formal', 'approved')).toBe(false);
    });

    it('lässt Überarbeiten nur aus approved zu', () => {
        expect(isAllowedFrom('reopen', 'approved')).toBe(true);
        expect(isAllowedFrom('reopen', 'in_capture')).toBe(false);
    });
});
