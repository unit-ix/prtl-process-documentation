// PROTOTYPE-ONLY — replaced at the fork by the same spec-driven shape using native means.
import {
    DEFAULT_PAGE_SIZE,
    type Page,
    type QueryOf,
    type QuerySpec,
    type SortDirection,
} from '../../ports/Query';

function matchesSearch(value: string, needle: string | undefined): boolean {
    const trimmed = needle?.trim();
    return !trimmed || value.toLowerCase().includes(trimmed.toLowerCase());
}

// Numbers numerically, everything else as German-collated text so umlauts sort correctly.
function compareValues(left: unknown, right: unknown): number {
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right), 'de');
}

export function applyQuery<TEntity, TSpec extends QuerySpec<TEntity>>(
    rows: readonly TEntity[],
    query: QueryOf<TEntity, TSpec> | undefined,
    spec: TSpec,
    clone: (row: TEntity) => TEntity,
): Page<TEntity> {
    const { filter, sort, limit = DEFAULT_PAGE_SIZE, cursor } = query ?? {};
    const { search, ...equality } = filter ?? {};
    const wanted = equality as Record<string, unknown>;

    const hits = rows.filter(
        (row) =>
            matchesSearch(String(row[spec.searchField]), search as string | undefined) &&
            spec.equalityFields.every(
                (field) => wanted[field] === undefined || row[field] === wanted[field],
            ),
    );

    if (sort) {
        const factor: number = (sort.dir as SortDirection) === 'desc' ? -1 : 1;
        const field = sort.field as keyof TEntity;
        hits.sort((left, right) => compareValues(left[field], right[field]) * factor);
    }

    const offset = Number(cursor ?? 0);
    const end = offset + limit;
    return {
        items: hits.slice(offset, end).map(clone),
        nextCursor: end < hits.length ? String(end) : null,
        total: hits.length,
    };
}
