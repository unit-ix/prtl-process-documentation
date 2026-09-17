import { CATEGORY_NUMBERS } from '@app/domain';
import { sql, type SQL } from 'drizzle-orm';
import { bigint, boolean, integer, jsonb, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const id = () => uuid('id').primaryKey().defaultRandom();

export const isActive = () => boolean('is_active').notNull().default(true);

export const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const legacyId = () => integer('legacy_id').unique();

export const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
    sql`${column} in ${sql.raw(`(${values.map((v) => `'${v.replaceAll("'", "''")}'`).join(', ')})`)}`;

export const inCategoryRange = (column: AnyPgColumn): SQL =>
    sql`${column} in ${sql.raw(`(${CATEGORY_NUMBERS.join(', ')})`)}`;

export const documentColumns = (uploadedBy: () => AnyPgColumn) => ({
    id: id(),
    fileName: text('file_name').notNull(),
    blobPath: text('blob_path').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    uploadedById: uuid('uploaded_by_id')
        .notNull()
        .references(uploadedBy),
    isActive: isActive(),
});

export const contentColumns = () => ({
    purpose: text('purpose'),
    scopeDetail: text('scope_detail'),
    terms: text('terms'),
    descriptionDoc: jsonb('description_doc'),
    descriptionText: text('description_text'),
    responsibilities: text('responsibilities'),
    workSequence: text('work_sequence'),
    method: text('method'),
    processParameters: text('process_parameters'),
    documentationRef: text('documentation_ref'),
    deviationHandling: text('deviation_handling'),
    maintenanceRef: text('maintenance_ref'),
});
