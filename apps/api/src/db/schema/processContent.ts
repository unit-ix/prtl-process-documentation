import { EVENT_KINDS, LINK_TYPES, PROCESS_STATUSES } from '@app/domain';
import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, documentColumns, id, isActive, legacyId, oneOf } from './columns.js';
import { users } from './masterData.js';
import { processes, processVersions } from './processes.js';

export const processAdditionalFields = pgTable('process_additional_fields', {
    id: id(),
    processVersionId: uuid('process_version_id')
        .notNull()
        .references(() => processVersions.id),
    title: text('title').notNull(),
    value: text('value'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: isActive(),
    legacyId: legacyId(),
});

export const processLinks = pgTable(
    'process_links',
    {
        id: id(),
        processVersionId: uuid('process_version_id')
            .notNull()
            .references(() => processVersions.id),
        linkType: text('link_type').notNull(),
        linkedProcessId: uuid('linked_process_id').references(() => processes.id),
        title: text('title'),
        url: text('url'),
        isActive: isActive(),
        legacyId: legacyId(),
    },
    (t) => [check('process_links_link_type_check', oneOf(t.linkType, LINK_TYPES))],
);

export const processEvents = pgTable(
    'process_events',
    {
        id: id(),
        processId: uuid('process_id')
            .notNull()
            .references(() => processes.id),
        processVersionId: uuid('process_version_id').references(() => processVersions.id),
        eventKind: text('event_kind').notNull(),
        newStatus: text('new_status').notNull(),
        actorId: uuid('actor_id')
            .notNull()
            .references(() => users.id),
        comment: text('comment'),
        recipientEmail: text('recipient_email'),
        isSent: boolean('is_sent').notNull().default(false),
        sentAt: timestamp('sent_at', { withTimezone: true }),
        sendError: text('send_error'),
        createdAt: createdAt(),
        legacyId: legacyId(),
    },
    (t) => [
        index('process_events_process_created_idx').on(t.processId, t.createdAt),
        check('process_events_event_kind_check', oneOf(t.eventKind, EVENT_KINDS)),
        check('process_events_new_status_check', oneOf(t.newStatus, PROCESS_STATUSES)),
    ],
);

export const processDocuments = pgTable('process_documents', {
    ...documentColumns(() => users.id),
    processId: uuid('process_id')
        .notNull()
        .references(() => processes.id),
    legacyId: legacyId(),
});

export type ProcessAdditionalFieldRow = typeof processAdditionalFields.$inferSelect;
export type ProcessLinkRow = typeof processLinks.$inferSelect;
export type ProcessEventRow = typeof processEvents.$inferSelect;
export type ProcessDocumentRow = typeof processDocuments.$inferSelect;
