// ListQuery → Query-String. Vertrag: ../../ports/Query.ts, serverseitiges Gegenstück:
// apps/api/src/router/list.ts. Der Cursor bleibt opak — hier ein Offset, in Dataverse ein skipToken.
import type { ListQuery } from '../../ports/Query';

/** Der gemeinsame Nenner aller entitäts-spezifischen Query-Typen (`ContactQuery` usw.). */
export type AnyListQuery = ListQuery<Record<string, unknown>, string>;

export function toSearchParams(query: AnyListQuery | undefined): URLSearchParams {
    const params = new URLSearchParams();
    const { filter, sort, limit, cursor } = query ?? {};

    for (const [field, value] of Object.entries(filter ?? {})) {
        if (value === undefined || value === null || value === '') continue;
        params.set(field, String(value));
    }

    if (sort) {
        params.set('sort', sort.field);
        params.set('dir', sort.dir);
    }
    if (limit !== undefined) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);

    return params;
}
