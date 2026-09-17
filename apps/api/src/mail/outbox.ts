// Die Warteschlange. Zwei Quellen, weil der Nachweis dort liegt, wo er hingehört: der Versandstand
// einer Workflow-Mail steht am Ereignis (§7.6), der einer Unterweisung am Teilnehmer (§7.3).
// Gesendet wird NIE im Request — Exchange drosselt bei ~30 Mails/Minute und der SWA-Proxy bricht
// nach 45 s ab. Die API schreibt Zeilen und antwortet sofort.
import { confirmLink, renderInstructionMail, renderProcessMail, type MailMessage } from '@app/domain';
import { randomUUID } from 'node:crypto';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { instructionParticipants, instructions, processEvents, processes, users } from '../db/schema/index.js';
import { mailEnv } from '../env.js';
import { hashToken } from '../router/instructionWrites.js';
import { MailRejected, type MailTransport } from './transport.js';

const BATCH = 25;
const TOKEN_DAYS = 30;

export interface SweepResult {
    readonly sent: number;
    readonly failed: number;
}

async function pendingEvents() {
    return db
        .select({
            id: processEvents.id,
            eventKind: processEvents.eventKind,
            comment: processEvents.comment,
            recipientEmail: processEvents.recipientEmail,
            actorName: users.displayName,
            processId: processes.id,
            title: processes.title,
            identifier: processes.identifier,
            documentNumber: processes.documentNumber,
            edition: processes.edition,
        })
        .from(processEvents)
        .innerJoin(processes, eq(processes.id, processEvents.processId))
        .leftJoin(users, eq(users.id, processEvents.actorId))
        .where(
            and(
                eq(processEvents.isSent, false),
                isNotNull(processEvents.recipientEmail),
                isNull(processEvents.sendError),
            ),
        )
        .limit(BATCH);
}

async function sendEvents(transport: MailTransport): Promise<SweepResult> {
    const { APP_URL } = mailEnv();
    let sent = 0;
    let failed = 0;

    for (const row of await pendingEvents()) {
        const rendered = renderProcessMail({
            eventKind: row.eventKind as never,
            processId: row.processId,
            title: row.title,
            identifier: row.identifier,
            documentNumber: row.documentNumber,
            edition: row.edition,
            comment: row.comment,
            actorName: row.actorName,
            appUrl: APP_URL,
        });

        // Kein Betreff für diese Ereignisart (revision_started) — die Zeile bleibt Audit-Spur und
        // wird als erledigt markiert, damit der Sweep sie nicht ewig wieder aufgreift.
        if (rendered === null) {
            await db.update(processEvents).set({ isSent: true, sentAt: new Date() }).where(eq(processEvents.id, row.id));
            continue;
        }

        const message: MailMessage = { to: row.recipientEmail as string, ...rendered };
        try {
            await transport.send(message);
            await db.update(processEvents).set({ isSent: true, sentAt: new Date() }).where(eq(processEvents.id, row.id));
            sent += 1;
        } catch (error) {
            failed += 1;
            // Nur fachliche Ablehnungen werden festgeschrieben; alles Vorübergehende bleibt offen
            // und wird beim nächsten Lauf erneut versucht.
            if (error instanceof MailRejected) {
                await db
                    .update(processEvents)
                    .set({ sendError: error.message.slice(0, 500) })
                    .where(eq(processEvents.id, row.id));
            }
        }
    }

    return { sent, failed };
}

async function pendingInstructions() {
    return db
        .select({
            participantId: instructionParticipants.id,
            mail: users.mail,
            processTitle: processes.title,
            identifier: processes.identifier,
            dueDate: instructions.dueDate,
            note: instructions.note,
        })
        .from(instructionParticipants)
        .innerJoin(instructions, eq(instructions.id, instructionParticipants.instructionId))
        .innerJoin(processes, eq(processes.id, instructions.processId))
        .innerJoin(users, eq(users.id, instructionParticipants.userId))
        .where(
            and(
                eq(instructionParticipants.notifyStatus, 'In Bearbeitung'),
                eq(instructionParticipants.isActive, true),
                eq(instructionParticipants.status, 'Offen'),
                isNotNull(users.mail),
            ),
        )
        .limit(BATCH);
}

async function sendInstructions(transport: MailTransport): Promise<SweepResult> {
    const { APP_URL } = mailEnv();
    let sent = 0;
    let failed = 0;

    for (const row of await pendingInstructions()) {
        // Das Token entsteht GENAU hier: im Klartext existiert es nur in dieser einen Mail, in der
        // Datenbank steht ausschliesslich der Hash (§7.3).
        const token = randomUUID();
        const rendered = renderInstructionMail({
            processTitle: row.processTitle,
            identifier: row.identifier,
            dueDate: row.dueDate,
            note: row.note,
            confirmUrl: confirmLink(APP_URL, token),
        });

        try {
            await transport.send({ to: row.mail as string, ...rendered });
            await db
                .update(instructionParticipants)
                .set({
                    confirmTokenHash: hashToken(token),
                    confirmTokenExpiresAt: new Date(Date.now() + TOKEN_DAYS * 24 * 60 * 60_000),
                    notifiedAt: new Date(),
                    notifyStatus: 'Fertig',
                })
                .where(eq(instructionParticipants.id, row.participantId));
            sent += 1;
        } catch (error) {
            failed += 1;
            if (error instanceof MailRejected) {
                await db
                    .update(instructionParticipants)
                    .set({ notifyStatus: 'Fehler' })
                    .where(eq(instructionParticipants.id, row.participantId));
            }
        }
    }

    return { sent, failed };
}

export async function drainOutbox(transport: MailTransport): Promise<SweepResult> {
    const events = await sendEvents(transport);
    const trainings = await sendInstructions(transport);
    return { sent: events.sent + trainings.sent, failed: events.failed + trainings.failed };
}

/** Wie viel wartet gerade? Für den Health-Blick, ohne etwas zu verschicken. */
export async function outboxDepth(): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(processEvents)
        .where(and(eq(processEvents.isSent, false), isNotNull(processEvents.recipientEmail), isNull(processEvents.sendError)));
    return row?.count ?? 0;
}
