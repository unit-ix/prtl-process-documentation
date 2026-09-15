import { describe, expect, it } from 'vitest';
import { answerFor, search, tokenize, type AssistantDocument } from './assistantSearch.js';

const doc = (overrides: Partial<AssistantDocument> & { title: string }): AssistantDocument => ({
    processId: overrides.title,
    identifier: null,
    shortDescription: null,
    purpose: null,
    areaTitle: 'Purchasing',
    descriptionText: null,
    ...overrides,
});

const CORPUS: AssistantDocument[] = [
    doc({ title: 'Lieferantenbewertung', identifier: 'VA PE 2 PUR.001', purpose: 'Bewertung von Lieferanten' }),
    doc({ title: 'Wareneingangsprüfung', identifier: 'VA PE 3 QAM.004', areaTitle: 'Quality Assurance Management' }),
    doc({ title: 'Reklamationsbearbeitung', descriptionText: 'Umgang mit Reklamationen von Lieferanten' }),
];

describe('tokenize', () => {
    it('wirft Füllwörter und kurze Wörter weg', () => {
        expect(tokenize('Wie ist der Prozess für die Bewertung?')).toEqual(['bewertung']);
    });

    it('trennt an Satzzeichen und behält Umlaute', () => {
        expect(tokenize('Wareneingangsprüfung, bitte!')).toEqual(['wareneingangsprüfung']);
    });

    it('gibt bei einer Frage ohne Inhalt nichts zurück', () => {
        expect(tokenize('Was ist das?')).toEqual([]);
        expect(tokenize('   ')).toEqual([]);
    });
});

describe('search', () => {
    it('findet über den Titel', () => {
        expect(search(CORPUS, 'Lieferantenbewertung')[0].title).toBe('Lieferantenbewertung');
    });

    it('findet über die Nummer', () => {
        expect(search(CORPUS, 'QAM.004')[0].title).toBe('Wareneingangsprüfung');
    });

    it('findet über den Bereich', () => {
        expect(search(CORPUS, 'Quality Assurance')[0].title).toBe('Wareneingangsprüfung');
    });

    it('gewichtet den Titel höher als den Fließtext', () => {
        const hits = search(CORPUS, 'Lieferanten');
        expect(hits[0].title).toBe('Lieferantenbewertung');
        expect(hits.map((hit) => hit.title)).toContain('Reklamationsbearbeitung');
    });

    it('gibt bei einer leeren oder inhaltslosen Frage nichts zurück', () => {
        expect(search(CORPUS, '')).toEqual([]);
        expect(search(CORPUS, 'Was ist das?')).toEqual([]);
    });

    it('gibt nichts zurück, wenn nichts passt', () => {
        expect(search(CORPUS, 'Weihnachtsfeier')).toEqual([]);
    });

    it('begrenzt die Trefferzahl', () => {
        const many = Array.from({ length: 12 }, (_, index) => doc({ title: `Lieferanten ${index}` }));
        expect(search(many, 'Lieferanten')).toHaveLength(5);
        expect(search(many, 'Lieferanten', 3)).toHaveLength(3);
    });

    // §7.10: der Aufrufer bekommt NUR, was in seinem Lesebereich liegt — der Index wird schon
    // gefiltert übergeben. Hier die Gegenprobe, dass die Suche nichts hinzuerfindet.
    it('durchsucht ausschliesslich den übergebenen Index', () => {
        expect(search([], 'Lieferantenbewertung')).toEqual([]);
    });
});

describe('answerFor', () => {
    it('sagt bei einem Treffer etwas anderes als bei mehreren', () => {
        expect(answerFor('Lieferanten', search(CORPUS, 'Lieferantenbewertung'))).toContain('ein freigegebener Prozess');
        expect(answerFor('Lieferanten', search(CORPUS, 'Lieferanten'))).toContain('2 freigegebene Prozesse');
    });

    it('bleibt bei null Treffern hilfreich', () => {
        expect(answerFor('Weihnachtsfeier', [])).toContain('keinen freigegebenen Prozess');
    });

    it('weist auf eine leere Frage hin', () => {
        expect(answerFor('Was ist das?', [])).toContain('mindestens einem Suchbegriff');
    });
});
