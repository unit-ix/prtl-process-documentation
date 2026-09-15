import type { SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { z } from 'zod';

export interface Resource {
    readonly table: PgTable;
    readonly idColumn: PgColumn;
    readonly searchColumn: PgColumn;
    readonly filters: Readonly<Record<string, { column: PgColumn; schema: z.ZodType }>>;
    readonly sorts: Readonly<Record<string, SQL>>;
    readonly defaultSort: string;
    readonly toDomain: (row: never) => unknown;
    readonly createSchema: z.ZodType;
    readonly updateSchema: z.ZodType;
}

export const RESOURCES: Readonly<Record<string, Resource>> = {};
