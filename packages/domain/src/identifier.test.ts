import { describe, expect, it } from 'vitest';
import {
    buildIdentifier,
    keepOrBuildIdentifier,
    keepOrMintDocumentNumber,
    nextEdition,
    type IdentifierParts,
} from './identifier.js';

const parts: IdentifierParts = {
    specificationType: 'VA',
    scope: 'PE',
    categoryNumber: 1,
    areaShortCode: 'IMS',
    documentNumber: 1,
};

describe('buildIdentifier', () => {
    it('baut das Beispiel aus der Spezifikation', () => {
        expect(buildIdentifier(parts)).toBe('VA PE 1 IMS.001');
    });

    it('füllt die laufende Nummer auf drei Stellen', () => {
        expect(buildIdentifier({ ...parts, documentNumber: 7 })).toContain('IMS.007');
        expect(buildIdentifier({ ...parts, documentNumber: 42 })).toContain('IMS.042');
        expect(buildIdentifier({ ...parts, documentNumber: 999 })).toContain('IMS.999');
    });

    it('schneidet vierstellige Nummern nicht ab', () => {
        expect(buildIdentifier({ ...parts, documentNumber: 1000 })).toContain('IMS.1000');
    });

    it('lässt einen fehlenden Geltungsbereich weg statt "null" zu schreiben', () => {
        expect(buildIdentifier({ ...parts, scope: null })).toBe('VA 1 IMS.001');
    });

    it('trägt Prozessart und Kategorie mit', () => {
        expect(buildIdentifier({ ...parts, specificationType: 'AA', categoryNumber: 3, scope: 'PEL' })).toBe(
            'AA PEL 3 IMS.001',
        );
    });
});

describe('keepOrBuildIdentifier', () => {
    // Defekt 3: ein Kennzeichen, das sich ändert, ist kein Kennzeichen.
    it('behält ein vorhandenes Kennzeichen, auch wenn die Teile abweichen', () => {
        expect(keepOrBuildIdentifier('VA PE 2 EK.001', { ...parts, documentNumber: 7 })).toBe('VA PE 2 EK.001');
    });

    it('prägt nur, wenn noch keines existiert', () => {
        expect(keepOrBuildIdentifier(null, parts)).toBe('VA PE 1 IMS.001');
    });
});

describe('keepOrMintDocumentNumber', () => {
    it('zieht die nächste Nummer im Bereich', () => {
        expect(keepOrMintDocumentNumber(null, 6)).toBe(7);
        expect(keepOrMintDocumentNumber(null, null)).toBe(1);
        expect(keepOrMintDocumentNumber(null, 0)).toBe(1);
    });

    it('behält eine einmal geprägte Nummer', () => {
        expect(keepOrMintDocumentNumber(3, 99)).toBe(3);
    });
});

describe('nextEdition', () => {
    it('zählt je Prozess hoch und beginnt bei 1', () => {
        expect(nextEdition(null)).toBe(1);
        expect(nextEdition(1)).toBe(2);
        expect(nextEdition(9)).toBe(10);
    });
});
