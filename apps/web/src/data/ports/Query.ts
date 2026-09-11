export type SortDirection = 'asc' | 'desc';

export const DEFAULT_PAGE_SIZE = 25;

export interface ListQuery<TFilter, TSortField extends string> {
    filter?: TFilter;
    sort?: { field: TSortField; dir: SortDirection };
    limit?: number;
    cursor?: string | null;
}

export interface Page<TEntity> {
    items: TEntity[];
    nextCursor: string | null;
    total: number | null;
}

export interface QuerySpec<TEntity> {
    readonly searchField: keyof TEntity & string;
    readonly equalityFields: readonly (keyof TEntity & string)[];
    readonly sortFields: readonly (keyof TEntity & string)[];
}

export type QueryOf<TEntity, TSpec extends QuerySpec<TEntity>> = ListQuery<
    Partial<Pick<TEntity, TSpec['equalityFields'][number]>> & { search?: string },
    TSpec['sortFields'][number]
>;
