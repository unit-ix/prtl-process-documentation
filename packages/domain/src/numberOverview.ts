// Nummernübersicht (Testauswertung 09.10.2026): je Bereich die VA mit ihren Unterdokumenten
// darunter. Reine Funktion, weil ein Fehler hier unsichtbar ist — ein Unterdokument, das keiner
// Zeile zugeordnet wird, fehlt einfach, und niemand bemerkt es, bis die Nummer doppelt vergeben ist.
import type { ProcessStatus, SpecificationType } from './enums.js';

export interface NumberRow {
    readonly id: string;
    readonly title: string;
    readonly areaId: string;
    readonly parentProcessId: string | null;
    readonly specificationType: SpecificationType;
    readonly status: ProcessStatus;
    readonly identifier: string | null;
    readonly documentNumber: number | null;
    readonly subNumber: number | null;
}

export interface NumberedProcess extends Omit<NumberRow, 'areaId'> {
    readonly children: readonly NumberedProcess[];
}

export interface NumberArea {
    readonly id: string;
    readonly title: string;
    readonly shortCode: string;
    readonly processes: readonly NumberedProcess[];
}

const byNumber =
    (key: 'documentNumber' | 'subNumber') =>
    (a: NumberRow, b: NumberRow): number =>
        (a[key] ?? Number.MAX_SAFE_INTEGER) - (b[key] ?? Number.MAX_SAFE_INTEGER) ||
        a.title.localeCompare(b.title, 'de');

const toNumbered = ({ areaId: _areaId, ...row }: NumberRow, children: readonly NumberedProcess[] = []): NumberedProcess => ({
    ...row,
    children,
});

/** Bereiche ohne Prozess fallen weg. Ein Unterdokument ohne sichtbare VA steht oben, nicht nirgends. */
export function buildNumberOverview(
    areas: readonly Pick<NumberArea, 'id' | 'title' | 'shortCode'>[],
    rows: readonly NumberRow[],
): NumberArea[] {
    const ids = new Set(rows.map((row) => row.id));
    const isChild = (row: NumberRow): boolean => row.parentProcessId !== null && ids.has(row.parentProcessId);
    const childrenOf = (id: string): NumberedProcess[] =>
        rows
            .filter((row) => row.parentProcessId === id)
            .sort(byNumber('subNumber'))
            .map((row) => toNumbered(row));

    return areas
        .map((area) => ({
            ...area,
            processes: rows
                .filter((row) => row.areaId === area.id && !isChild(row))
                .sort(byNumber('documentNumber'))
                .map((row) => toNumbered(row, childrenOf(row.id))),
        }))
        .filter((area) => area.processes.length > 0);
}

const matches = (process: NumberedProcess, needle: string): boolean =>
    [process.title, process.identifier ?? ''].some((text) => text.toLowerCase().includes(needle));

/**
 * Suche in der Nummernübersicht. Trifft die VA, bleibt sie mit allen Unterdokumenten stehen — man
 * sucht sie meist, um ihre Familie zu sehen. Trifft nur ein Unterdokument, bleibt seine VA als
 * Rahmen stehen, sonst stünde OM.001_02 ohne die Nummer, die es trägt. Trifft der Bereich (Titel
 * oder Kürzel), bleibt er ganz.
 */
export function filterNumberOverview(overview: readonly NumberArea[], query: string): NumberArea[] {
    const needle = query.trim().toLowerCase();
    if (needle === '') return [...overview];

    return overview
        .map((area) => {
            if ([area.title, area.shortCode].some((text) => text.toLowerCase().includes(needle))) return area;
            const processes = area.processes.flatMap((process) => {
                if (matches(process, needle)) return [process];
                const children = process.children.filter((child) => matches(child, needle));
                return children.length === 0 ? [] : [{ ...process, children }];
            });
            return { ...area, processes };
        })
        .filter((area) => area.processes.length > 0);
}
