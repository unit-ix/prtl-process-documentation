import { boolean, check, pgTable, smallint, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { id, inCategoryRange, isActive, legacyId } from './columns.js';

export const areas = pgTable(
    'areas',
    {
        id: id(),
        title: text('title').notNull(),
        shortCode: text('short_code').notNull(),
        categoryNumber: smallint('category_number').notNull(),
        processOwnerId: uuid('process_owner_id').references((): AnyPgColumn => users.id),
        isActive: isActive(),
        legacyId: legacyId(),
    },
    (t) => [check('areas_category_number_check', inCategoryRange(t.categoryNumber))],
);

export const users = pgTable('users', {
    id: id(),
    entraObjectId: text('entra_object_id').notNull().unique(),
    displayName: text('display_name').notNull(),
    mail: text('mail'),
    isAuthor: boolean('is_author').notNull().default(false),
    isProcessOwner: boolean('is_process_owner').notNull().default(false),
    isQm: boolean('is_qm').notNull().default(false),
    isAdministrator: boolean('is_administrator').notNull().default(false),
    areaId: uuid('area_id').references((): AnyPgColumn => areas.id),
    isActive: isActive(),
    legacyId: legacyId(),
});

export type AreaRow = typeof areas.$inferSelect;
export type UserRow = typeof users.$inferSelect;
