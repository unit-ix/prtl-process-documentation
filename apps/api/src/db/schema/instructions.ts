import { INSTRUCTION_TYPES, NOTIFY_STATUSES, PARTICIPANT_STATUSES, RECURRENCES } from '@app/domain';
import { check, date, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { createdAt, documentColumns, id, isActive, legacyId, oneOf } from './columns.js';
import { users } from './masterData.js';
import { processes } from './processes.js';

export const instructions = pgTable(
    'instructions',
    {
        id: id(),
        processId: uuid('process_id')
            .notNull()
            .references(() => processes.id),
        instructionType: text('instruction_type').notNull(),
        dueDate: date('due_date'),
        recurrence: text('recurrence').notNull().default('Keine Wiederholung'),
        note: text('note'),
        createdById: uuid('created_by_id')
            .notNull()
            .references(() => users.id),
        // Folgerunde einer wiederkehrenden Unterweisung (§7.8). Die Vorgängerin bleibt unangetastet
        // — sie IST der Nachweis. Der eindeutige Index ist der Schutz gegen zwei Folgerunden: das
        // gehört in die Datenbank und nicht in die Sorgfalt des Sweeps.
        previousInstructionId: uuid('previous_instruction_id').references((): AnyPgColumn => instructions.id),
        createdAt: createdAt(),
        isActive: isActive(),
        legacyId: legacyId(),
    },
    (t) => [
        check('instructions_instruction_type_check', oneOf(t.instructionType, INSTRUCTION_TYPES)),
        check('instructions_recurrence_check', oneOf(t.recurrence, RECURRENCES)),
        unique('instructions_previous_unique').on(t.previousInstructionId),
    ],
);

export const instructionParticipants = pgTable(
    'instruction_participants',
    {
        id: id(),
        instructionId: uuid('instruction_id')
            .notNull()
            .references(() => instructions.id),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id),
        status: text('status').notNull().default('Offen'),
        notifiedAt: timestamp('notified_at', { withTimezone: true }),
        confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
        notifyStatus: text('notify_status'),
        confirmTokenHash: text('confirm_token_hash'),
        confirmTokenExpiresAt: timestamp('confirm_token_expires_at', { withTimezone: true }),
        consumedAt: timestamp('consumed_at', { withTimezone: true }),
        sourceIp: text('source_ip'),
        userAgent: text('user_agent'),
        isActive: isActive(),
        legacyId: legacyId(),
    },
    (t) => [
        unique('instruction_participants_instruction_user_unique').on(t.instructionId, t.userId),
        check('instruction_participants_status_check', oneOf(t.status, PARTICIPANT_STATUSES)),
        check('instruction_participants_notify_status_check', oneOf(t.notifyStatus, NOTIFY_STATUSES)),
    ],
);

export const instructionDocuments = pgTable('instruction_documents', {
    ...documentColumns(() => users.id),
    instructionId: uuid('instruction_id')
        .notNull()
        .references(() => instructions.id),
    legacyId: legacyId(),
});

export type InstructionRow = typeof instructions.$inferSelect;
export type InstructionParticipantRow = typeof instructionParticipants.$inferSelect;
export type InstructionDocumentRow = typeof instructionDocuments.$inferSelect;
