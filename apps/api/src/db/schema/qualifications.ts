import { check, date, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { documentColumns, id, isActive, legacyId } from './columns.js';
import { users } from './masterData.js';

export const qualifications = pgTable(
    'qualifications',
    {
        id: id(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id),
        title: text('title').notNull(),
        description: text('description'),
        acquiredAt: date('acquired_at'),
        expiresAt: date('expires_at'),
        skillPoints: smallint('skill_points'),
        reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
        isActive: isActive(),
        legacyId: legacyId(),
    },
    (t) => [check('qualifications_skill_points_check', sql`${t.skillPoints} between 1 and 4`)],
);

export const userTasks = pgTable('user_tasks', {
    id: id(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    isActive: isActive(),
    legacyId: legacyId(),
});

export const qualificationDocuments = pgTable('qualification_documents', {
    ...documentColumns(() => users.id),
    qualificationId: uuid('qualification_id')
        .notNull()
        .references(() => qualifications.id),
    legacyId: legacyId(),
});

export type QualificationRow = typeof qualifications.$inferSelect;
export type UserTaskRow = typeof userTasks.$inferSelect;
export type QualificationDocumentRow = typeof qualificationDocuments.$inferSelect;
