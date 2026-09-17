import { describe, expect, it } from 'vitest';
import { completeness, isComplete } from './completeness.js';
import type { ProcessContent } from './ProcessContent.js';

const full: Partial<ProcessContent> = {
    purpose: 'Zweck',
    scopeDetail: 'Geltungsbereich',
    terms: 'Begriffe',
    responsibilities: 'Zuständigkeiten',
    descriptionText: 'Beschreibung',
};

describe('completeness', () => {
    it('IMS hat 5 Prüfpunkte, PROD 4', () => {
        expect(completeness(full, 'IMS').total).toBe(5);
        expect(completeness(full, 'PROD').total).toBe(4);
    });

    // Canvas-Defekt: dort war "Begriffe" auch für PROD Pflicht, im PROD-Editor aber gar nicht da —
    // ein PROD-Prozess konnte nie 100 % erreichen.
    it('erreicht in beiden Vorlagen 100 %', () => {
        expect(completeness(full, 'IMS').percent).toBe(100);
        expect(completeness({ ...full, terms: null }, 'PROD').percent).toBe(100);
    });

    it('zählt Begriffe nur für IMS', () => {
        expect(completeness({ ...full, terms: null }, 'IMS').percent).toBe(80);
        expect(completeness({ ...full, terms: null }, 'PROD').percent).toBe(100);
    });

    // §10 C3: das Feld bleibt, es zählt nur nicht mehr mit.
    it('ignoriert Mitgeltende Unterlagen', () => {
        expect(completeness(full, 'IMS').checks.map((c) => c.key)).not.toContain('links');
    });

    it('wertet Leerzeichen als leer', () => {
        expect(completeness({ ...full, purpose: '   ' }, 'IMS').percent).toBe(80);
        expect(completeness({ ...full, descriptionText: '\n\t ' }, 'IMS').done).toBe(4);
    });

    it('behandelt null und undefined gleich', () => {
        expect(completeness({}, 'PROD')).toMatchObject({ done: 0, percent: 0 });
        expect(completeness({ purpose: null }, 'PROD').percent).toBe(0);
    });

    it('rundet auf ganze Prozent', () => {
        expect(completeness({ purpose: 'x' }, 'IMS').percent).toBe(20);
        expect(completeness({ purpose: 'x' }, 'PROD').percent).toBe(25);
    });

    it('isComplete ist genau 100 %', () => {
        expect(isComplete(full, 'IMS')).toBe(true);
        expect(isComplete({ ...full, purpose: null }, 'IMS')).toBe(false);
    });
});
