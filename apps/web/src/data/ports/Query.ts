// Backend-agnostic query contract — see .claude/docs/prototype-patterns.md -> Data-Seam.

export type SortDirection = 'asc' | 'desc';

export const DEFAULT_PAGE_SIZE = 25;

export interface ListQuery<TFilter, TSortField extends string> {
    filter?: TFilter;
    sort?: { field: TSortField; dir: SortDirection };
    limit?: number;
    /** OPAQUE: an offset in mock/azure, Dataverse's native skipToken. */
    cursor?: string | null;
}

export interface Page<TEntity> {
    items: TEntity[];
    /** `null` means last page. */
    nextCursor: string | null;
    /** `null` when the backend cannot count (Dataverse has no count field). */
    total: number | null;
}

/**
 * What an entity can be filtered and sorted by, read by both `QueryOf` and each adapter's
 * translation. Domain field names only — backend columns and choice codes stay in the adapter.
 *
 * Keep `sortFields` to text, number and ISO date. Choice and lookup fields sort differently per
 * backend.
 */
export interface QuerySpec<TEntity> {
    readonly searchField: keyof TEntity & string;
    readonly equalityFields: readonly (keyof TEntity & string)[];
    readonly sortFields: readonly (keyof TEntity & string)[];
}

/** Declare specs with `as const satisfies QuerySpec<T>`, then derive the query type from them. */
export type QueryOf<TEntity, TSpec extends QuerySpec<TEntity>> = ListQuery<
    Partial<Pick<TEntity, TSpec['equalityFields'][number]>> & { search?: string },
    TSpec['sortFields'][number]
>;
