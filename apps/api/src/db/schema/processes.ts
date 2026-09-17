import { CONFIDENTIALITIES, PROCESS_STATUSES, SCOPES, SPECIFICATION_TYPES, TEMPLATE_TYPES } from '@app/domain';
import { boolean, check, integer, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { contentColumns, createdAt, id, isActive, legacyId, oneOf } from './columns.js';
import { areas, users } from './masterData.js';

export const processes = pgTable(
    'processes',
    {
        id: id(),
        title: text('title').notNull(),
        shortDescription: text('short_description'),
        identifier: text('identifier'),
        documentNumber: integer('document_number'),
        edition: integer('edition'),
        specificationType: text('specification_type').notNull(),
        templateType: text('template_type').notNull(),
        scope: text('scope'),
        status: text('status').notNull(),
        confidentiality: text('confidentiality'),
        hasActiveDraft: boolean('has_active_draft').notNull().default(false),
        areaId: uuid('area_id')
            .notNull()
            .references(() => areas.id),
        authorId: uuid('author_id').references(() => users.id),
        approvedByQmId: uuid('approved_by_qm_id').references(() => users.id),
        currentVersionId: uuid('current_version_id').references((): AnyPgColumn => processVersions.id),
        parentProcessId: uuid('parent_process_id').references((): AnyPgColumn => processes.id),
        approvedAt: timestamp('approved_at', { withTimezone: true }),
        createdAt: createdAt(),
        isActive: isActive(),
        legacyId: legacyId(),
        ...contentColumns(),
    },
    (t) => [
        unique('processes_area_document_number_unique').on(t.areaId, t.documentNumber),
        check('processes_specification_type_check', oneOf(t.specificationType, SPECIFICATION_TYPES)),
        check('processes_template_type_check', oneOf(t.templateType, TEMPLATE_TYPES)),
        check('processes_scope_check', oneOf(t.scope, SCOPES)),
        check('processes_status_check', oneOf(t.status, PROCESS_STATUSES)),
        check('processes_confidentiality_check', oneOf(t.confidentiality, CONFIDENTIALITIES)),
    ],
);

export const processVersions = pgTable(
    'process_versions',
    {
        id: id(),
        processId: uuid('process_id')
            .notNull()
            .references(() => processes.id),
        edition: integer('edition'),
        status: text('status').notNull(),
        authorId: uuid('author_id').references(() => users.id),
        processOwnerId: uuid('process_owner_id').references(() => users.id),
        approvedByQmId: uuid('approved_by_qm_id').references(() => users.id),
        changeReason: text('change_reason'),
        submittedAt: timestamp('submitted_at', { withTimezone: true }),
        contentReviewedAt: timestamp('content_reviewed_at', { withTimezone: true }),
        approvedAt: timestamp('approved_at', { withTimezone: true }),
        snapshotHtml: text('snapshot_html'),
        createdAt: createdAt(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
        rowVersion: integer('row_version').notNull().default(1),
        isActive: isActive(),
        legacyId: legacyId(),
        ...contentColumns(),
    },
    (t) => [
        unique('process_versions_process_edition_unique').on(t.processId, t.edition),
        check('process_versions_status_check', oneOf(t.status, PROCESS_STATUSES)),
    ],
);

export type ProcessRow = typeof processes.$inferSelect;
export type ProcessVersionRow = typeof processVersions.$inferSelect;
