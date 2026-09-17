import {
    PROCESS_SORT_FIELDS,
    PROCESS_STATUSES,
    SPECIFICATION_TYPES,
    TEMPLATE_TYPES,
    type ProcessListItem,
    type ProcessSortField,
    type SessionUser,
} from '@app/domain';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { db } from '../db/client.js';
import { areas, processes, processVersions, users } from '../db/schema/index.js';
import { badRequest } from '../http/errors.js';
import { readScope } from './processScope.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const parentProcesses = alias(processes, 'parent_processes');
const authors = alias(users, 'authors');

const querySchema = z.object({
    search: z.string().trim().optional(),
    area: z.string().uuid().optional(),
    specificationType: z.enum(SPECIFICATION_TYPES).optional(),
    templateType: z.enum(TEMPLATE_TYPES).optional(),
    status: z.enum(PROCESS_STATUSES).optional(),
    sort: z.enum(PROCESS_SORT_FIELDS).default('identifier'),
    dir: z.enum(['asc', 'desc']).default('asc'),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    cursor: z.coerce.number().int().min(0).default(0),
});

const german = (column: SQL | ReturnType<typeof sql>): SQL => sql`${column} collate "de-DE-x-icu"`;

const SORTS: Record<ProcessSortField, SQL> = {
    identifier: sql`${processes.identifier}`,
    title: german(sql`${processes.title}`),
    status: sql`coalesce(${processVersions.status}, ${processes.status})`,
    area: german(sql`${areas.title}`),
};

function searchPattern(raw: string): string {
    return `%${raw.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function filters(query: z.infer<typeof querySchema>): SQL[] {
    const where: SQL[] = [eq(processes.isActive, true)];

    if (query.search) {
        const pattern = searchPattern(query.search);
        where.push(or(ilike(processes.title, pattern), ilike(processes.identifier, pattern)) as SQL);
    }
    if (query.area) where.push(eq(processes.areaId, query.area));
    if (query.specificationType) where.push(eq(processes.specificationType, query.specificationType));
    if (query.templateType) where.push(eq(processes.templateType, query.templateType));
    if (query.status) {
        where.push(sql`coalesce(${processVersions.status}, ${processes.status}) = ${query.status}`);
    }

    return where;
}

function ordering(query: z.infer<typeof querySchema>): SQL[] {
    const direction = query.dir === 'desc' ? desc : asc;
    const groupKey = sql`coalesce(${parentProcesses.identifier}, ${processes.identifier})`;
    return [
        sql`${direction(groupKey)} nulls last`,
        sql`${direction(SORTS[query.sort])} nulls last`,
        asc(processes.createdAt),
    ];
}

type Row = {
    id: string;
    title: string;
    identifier: string | null;
    specificationType: string;
    templateType: string;
    shellStatus: string;
    versionStatus: string | null;
    edition: number | null;
    hasActiveDraft: boolean;
    parentProcessId: string | null;
    authorId: string | null;
    areaId: string;
    areaTitle: string;
    areaShortCode: string;
    areaCategoryNumber: number;
    versionAuthorId: string | null;
    versionAuthorName: string | null;
};

const toListItem = (row: Row): ProcessListItem => ({
    id: row.id,
    title: row.title,
    identifier: row.identifier,
    specificationType: row.specificationType as ProcessListItem['specificationType'],
    templateType: row.templateType as ProcessListItem['templateType'],
    status: (row.versionStatus ?? row.shellStatus) as ProcessListItem['status'],
    edition: row.edition,
    hasActiveDraft: row.hasActiveDraft,
    parentProcessId: row.parentProcessId,
    area: {
        id: row.areaId,
        title: row.areaTitle,
        shortCode: row.areaShortCode,
        categoryNumber: row.areaCategoryNumber,
    },
    author:
        row.versionAuthorId && row.versionAuthorName
            ? { id: row.versionAuthorId, displayName: row.versionAuthorName }
            : null,
    authorId: row.authorId,
});

export interface ProcessPage {
    readonly items: ProcessListItem[];
    readonly nextCursor: string | null;
    readonly total: number;
}

export async function listProcesses(
    user: SessionUser,
    rawQuery: Record<string, string | undefined>,
): Promise<ProcessPage> {
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
        throw badRequest(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    const query = parsed.data;
    const scope = readScope(user);
    const where = [...filters(query), ...(scope ? [scope] : [])];

    const rows = await db
        .select({
            id: processes.id,
            title: processes.title,
            identifier: processes.identifier,
            specificationType: processes.specificationType,
            templateType: processes.templateType,
            shellStatus: processes.status,
            versionStatus: processVersions.status,
            edition: processes.edition,
            hasActiveDraft: processes.hasActiveDraft,
            parentProcessId: processes.parentProcessId,
            authorId: processes.authorId,
            areaId: areas.id,
            areaTitle: areas.title,
            areaShortCode: areas.shortCode,
            areaCategoryNumber: areas.categoryNumber,
            versionAuthorId: authors.id,
            versionAuthorName: authors.displayName,
            total: sql<string>`count(*) over()`,
        })
        .from(processes)
        .innerJoin(areas, eq(areas.id, processes.areaId))
        .leftJoin(processVersions, eq(processVersions.id, processes.currentVersionId))
        .leftJoin(authors, eq(authors.id, processVersions.authorId))
        .leftJoin(parentProcesses, eq(parentProcesses.id, processes.parentProcessId))
        .where(and(...where))
        .orderBy(...ordering(query))
        .limit(query.limit)
        .offset(query.cursor);

    const total = rows.length > 0 ? Number(rows[0].total) : 0;
    const next = query.cursor + query.limit;

    return {
        items: rows.map(toListItem),
        nextCursor: next < total ? String(next) : null,
        total,
    };
}
