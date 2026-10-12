import { describe, expect, it } from 'vitest';
import { buildNumberOverview, filterNumberOverview, type NumberRow } from './numberOverview.js';

const AREAS = [
    { id: 'om', title: 'Ordermanagement', shortCode: 'OM' },
    { id: 'hr', title: 'Human Resources', shortCode: 'HR' },
];

const row = (id: string, overrides: Partial<NumberRow> = {}): NumberRow => ({
    id,
    title: id,
    areaId: 'om',
    parentProcessId: null,
    specificationType: 'VA',
    status: 'approved',
    identifier: null,
    documentNumber: null,
    subNumber: null,
    ...overrides,
});

describe('buildNumberOverview', () => {
    it('hängt Unterdokumente unter ihre VA, nach Unternummer sortiert', () => {
        const [om] = buildNumberOverview(AREAS, [
            row('va', { documentNumber: 1 }),
            row('aa2', { parentProcessId: 'va', specificationType: 'AA', subNumber: 2 }),
            row('aa1', { parentProcessId: 'va', specificationType: 'AA', subNumber: 1 }),
        ]);
        expect(om?.processes.map((p) => p.id)).toEqual(['va']);
        expect(om?.processes[0]?.children.map((c) => c.id)).toEqual(['aa1', 'aa2']);
    });

    it('sortiert nach Nummer, Entwürfe ohne Nummer ans Ende', () => {
        const [om] = buildNumberOverview(AREAS, [
            row('draft'),
            row('three', { documentNumber: 3 }),
            row('one', { documentNumber: 1 }),
        ]);
        expect(om?.processes.map((p) => p.id)).toEqual(['one', 'three', 'draft']);
    });

    it('verliert kein Unterdokument, dessen VA nicht in der Liste steht', () => {
        const [om] = buildNumberOverview(AREAS, [row('orphan', { parentProcessId: 'gone', specificationType: 'AA' })]);
        expect(om?.processes.map((p) => p.id)).toEqual(['orphan']);
    });

    it('lässt Bereiche ohne Prozess weg und trennt die Bereiche', () => {
        const overview = buildNumberOverview(AREAS, [row('a', { documentNumber: 1 })]);
        expect(overview.map((area) => area.shortCode)).toEqual(['OM']);
    });

    it('zählt jede Zeile genau einmal', () => {
        const rows = [
            row('va', { documentNumber: 1 }),
            row('aa', { parentProcessId: 'va', specificationType: 'AA', subNumber: 1 }),
            row('hr1', { areaId: 'hr', documentNumber: 1 }),
        ];
        const shown = buildNumberOverview(AREAS, rows).flatMap((area) =>
            area.processes.flatMap((p) => [p.id, ...p.children.map((c) => c.id)]),
        );
        expect(shown.sort()).toEqual(['aa', 'hr1', 'va']);
    });
});

describe('filterNumberOverview', () => {
    const overview = buildNumberOverview(AREAS, [
        row('va', { title: 'Auftragsabwicklung', identifier: 'VA PE 2 OM.001', documentNumber: 1 }),
        row('aa1', { title: 'Rechnung', identifier: 'AA PE 2 OM.001_01', parentProcessId: 'va', subNumber: 1 }),
        row('aa2', { title: 'Mahnung', identifier: 'AA PE 2 OM.001_02', parentProcessId: 'va', subNumber: 2 }),
        row('va2', { title: 'Reklamation', identifier: 'VA PE 2 OM.002', documentNumber: 2 }),
        row('hr', { title: 'Urlaub', areaId: 'hr', documentNumber: 1 }),
    ]);
    const ids = (query: string) =>
        filterNumberOverview(overview, query).flatMap((area) =>
            area.processes.flatMap((p) => [p.id, ...p.children.map((c) => c.id)]),
        );

    it('zeigt ohne Suchbegriff alles', () => {
        expect(ids('  ')).toEqual(['va', 'aa1', 'aa2', 'va2', 'hr']);
    });

    it('behält bei einem Treffer auf die VA alle Unterdokumente', () => {
        expect(ids('auftrag')).toEqual(['va', 'aa1', 'aa2']);
    });

    it('behält bei einem Treffer auf ein Unterdokument dessen VA als Rahmen', () => {
        expect(ids('mahnung')).toEqual(['va', 'aa2']);
    });

    it('findet über das Kennzeichen, unabhängig von Groß- und Kleinschreibung', () => {
        expect(ids('om.001_01')).toEqual(['va', 'aa1']);
        expect(ids('OM.002')).toEqual(['va2']);
    });

    it('zeigt bei einem Treffer auf den Bereich den ganzen Bereich', () => {
        expect(ids('human')).toEqual(['hr']);
    });

    it('liefert ohne Treffer nichts', () => {
        expect(ids('gibt es nicht')).toEqual([]);
    });
});
