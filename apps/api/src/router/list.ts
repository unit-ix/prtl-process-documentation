import { and, asc, desc, ilike, eq, type SQL, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { badRequest } from '../http/errors.js';
import type { Resource } from './registry.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface Page {
    items: unknown[];
    nextCursor: string | null;
    total: number | null;
}

type Query = Record<string, string | undefined>;

function searchPattern(raw: string): string {
    return `%${raw.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function conditions(resource: Resource, query: Query): SQL[] {
    const where: SQL[] = [];

    const search = query.search?.trim();
    if (search) where.push(ilike(resource.searchColumn, searchPattern(search)));

    for (const [field, { column, schema }] of Object.entries(resource.filters)) {
        const raw = query[field];
        if (raw === undefined || raw === '') continue;
        const parsed = schema.safeParse(raw);
        if (!parsed.success) throw badRequest(`Ungültiger Wert für Filter "${field}".`);
        where.push(eq(column, parsed.data));
    }

    return where;
}

function orderBy(resource: Resource, query: Query): SQL {
    const field = query.sort ?? resource.defaultSort;
    const expression = resource.sorts[field];
    if (!expression) throw badRequest(`Sortierung nach "${field}" ist nicht erlaubt.`);
    return query.dir === 'desc' ? desc(expression) : asc(expression);
}

function paging(query: Query): { limit: number; offset: number } {
    const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(Number(query.cursor) || 0, 0);
    return { limit, offset };
}

export async function listRows(resource: Resource, query: Query): Promise<Page> {
    const where = conditions(resource, query);
    const { limit, offset } = paging(query);

    const rows = await db
        .select({ row: resource.table, total: sql<string>`count(*) over()` })
        .from(resource.table)
        .where(where.length > 0 ? and(...where) : undefined)
        .orderBy(orderBy(resource, query))
        .limit(limit)
        .offset(offset);

    const total = rows.length > 0 ? Number(rows[0].total) : 0;

    return {
        items: rows.map((r) => resource.toDomain(r.row as never)),
        nextCursor: offset + limit < total ? String(offset + limit) : null,
        total,
    };
}
