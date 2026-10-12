import { describe, expect, it } from 'vitest';
import { buildNumberOverview, type NumberRow } from './numberOverview.js';

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
