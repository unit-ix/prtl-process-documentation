import { type SQL, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import {
    companies,
    companyStatusEnum,
    contactRoleEnum,
    contacts,
    industryEnum,
    type CompanyRow,
    type ContactRow,
} from '../db/schema.js';

const german = (column: PgColumn): SQL => sql`${column} collate "de-DE-x-icu"`;

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

const isoDate = (value: Date): string => value.toISOString();

const companyBody = {
    name: z.string().min(1),
    industry: z.enum(industryEnum.enumValues),
    status: z.enum(companyStatusEnum.enumValues),
    employeeCount: z.number().int().nonnegative(),
    city: z.string(),
    website: z.string(),
};

const companyResource: Resource = {
    table: companies,
    idColumn: companies.id,
    searchColumn: companies.name,
    filters: {
        industry: { column: companies.industry, schema: z.enum(companyBody.industry.options) },
        status: { column: companies.status, schema: z.enum(companyBody.status.options) },
    },
    sorts: {
        name: german(companies.name),
        city: german(companies.city),
        employeeCount: sql`${companies.employeeCount}`,
        createdOn: sql`${companies.createdOn}`,
    },
    defaultSort: 'name',
    toDomain: (row: CompanyRow) => ({ ...row, createdOn: isoDate(row.createdOn) }),
    createSchema: z.object(companyBody).strict(),
    updateSchema: z.object(companyBody).partial().strict(),
};

const contactBody = {
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string(),
    phone: z.string(),
    role: z.enum(contactRoleEnum.enumValues),
    isPrimary: z.boolean(),
    company: z.object({ id: z.string().uuid() }),
};

const contactResource: Resource = {
    table: contacts,
    idColumn: contacts.id,
    searchColumn: contacts.fullName,
    filters: {
        role: { column: contacts.role, schema: z.enum(contactBody.role.options) },
        isPrimary: { column: contacts.isPrimary, schema: z.enum(['true', 'false']).transform((v) => v === 'true') },
        'company.id': { column: contacts.companyId, schema: z.string().uuid() },
    },
    sorts: {
        fullName: german(contacts.fullName),
        email: german(contacts.email),
        createdOn: sql`${contacts.createdOn}`,
    },
    defaultSort: 'fullName',
    toDomain: (row: ContactRow) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        fullName: row.fullName ?? `${row.firstName} ${row.lastName}`,
        email: row.email,
        phone: row.phone,
        role: row.role,
        company: { id: row.companyId },
        isPrimary: row.isPrimary,
        createdOn: isoDate(row.createdOn),
    }),
    createSchema: z.object(contactBody).strict(),
    updateSchema: z.object(contactBody).partial().strict(),
};

export const RESOURCES: Readonly<Record<string, Resource>> = {
    companies: companyResource,
    contacts: contactResource,
};

export function toColumns(input: Record<string, unknown>): Record<string, unknown> {
    const { company, ...rest } = input;
    if (company && typeof company === 'object' && 'id' in company) {
        return { ...rest, companyId: (company as { id: string }).id };
    }
    return rest;
}
