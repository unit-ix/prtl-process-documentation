// Anlegen, Ändern, Bestätigen. Canvas fügt beim Bearbeiten immer NEU ein, ein bearbeiteter
// Datensatz wird dort also stillschweigend zu einem zweiten (§12, Defekt 5) — hier sind Anlegen und
// Ändern getrennte Wege.
import { canManageInstructions, defaultDueDate, type SessionUser } from '@app/domain';
import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { instructionDocuments, instructionParticipants, instructions, processes, users } from '../db/schema/index.js';

import { badRequest, forbidden, notFound } from '../http/errors.js';
import { today } from './instructions.js';

export const instructionSchema = z
    .object({
        processId: z.string().uuid(),
        instructionType: z.enum(['Einzel', 'Sammel']),
        dueDate: z.string().date().nullish(),
        recurrence: z.enum(['Keine Wiederholung', 'Vierteljährlich', 'Halbjährlich', 'Jährlich']).optional(),
        note: z.string().trim().max(4000).nullish(),
        participantIds: z.array(z.string().uuid()).min(1),
    })
    .strict();

export type InstructionInput = z.infer<typeof instructionSchema>;

const assertManager = (user: SessionUser): void => {
    if (!canManageInstructions(user)) throw forbidden('Unterweisungen dürfen Administration und Bereichsleitung anlegen.');
};

async function assertReleasedProcess(processId: string): Promise<void> {
    const [row] = await db
        .select({ status: processes.status })
        .from(processes)
        .where(and(eq(processes.id, processId), eq(processes.isActive, true)))
        .limit(1);
    if (!row) throw notFound('Prozess nicht gefunden.');
    // §7.1: unterwiesen wird auf eine freigegebene Ausgabe, nie auf einen Entwurf.
    if (row.status !== 'approved') throw badRequest('Nur freigegebene Prozesse können unterwiesen werden.');
}

export async function createInstruction(user: SessionUser, input: InstructionInput): Promise<{ id: string }> {
    assertManager(user);
    await assertReleasedProcess(input.processId);

    return db.transaction(async (tx) => {
        const [instruction] = await tx
            .insert(instructions)
            .values({
                processId: input.processId,
                instructionType: input.instructionType,
                dueDate: input.dueDate ?? defaultDueDate(today()),
                recurrence: input.recurrence ?? 'Keine Wiederholung',
                note: input.note ?? null,
                createdById: user.id,
            })
            .returning({ id: instructions.id });

        await tx
            .insert(instructionParticipants)
            .values(input.participantIds.map((userId) => ({ instructionId: instruction.id, userId })));

        return { id: instruction.id };
    });
}

export async function updateInstruction(user: SessionUser, id: string, input: InstructionInput): Promise<void> {
    assertManager(user);
    await assertReleasedProcess(input.processId);

    await db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: instructions.id })
            .from(instructions)
            .where(and(eq(instructions.id, id), eq(instructions.isActive, true)))
            .limit(1);
        if (!existing) throw notFound('Unterweisung nicht gefunden.');

        await tx
            .update(instructions)
            .set({
                processId: input.processId,
                instructionType: input.instructionType,
                dueDate: input.dueDate ?? null,
                recurrence: input.recurrence ?? 'Keine Wiederholung',
                note: input.note ?? null,
            })
            .where(eq(instructions.id, id));

        const current = await tx
            .select({ id: instructionParticipants.id, userId: instructionParticipants.userId })
            .from(instructionParticipants)
            .where(and(eq(instructionParticipants.instructionId, id), eq(instructionParticipants.isActive, true)));

        const wanted = new Set(input.participantIds);
        const removed = current.filter((participant) => !wanted.has(participant.userId)).map((p) => p.id);
        const existingUsers = new Set(current.map((participant) => participant.userId));
        const added = input.participantIds.filter((userId) => !existingUsers.has(userId));

        if (removed.length > 0) {
            await tx
                .update(instructionParticipants)
                .set({ isActive: false })
                .where(inArray(instructionParticipants.id, removed));
        }
        if (added.length > 0) {
            await tx.insert(instructionParticipants).values(added.map((userId) => ({ instructionId: id, userId })));
        }
    });
}

/** Canvas löscht die Teilnehmer hart und vernichtet damit den Nachweis (§12, Defekt 22). */
export async function deleteInstruction(user: SessionUser, id: string): Promise<void> {
    assertManager(user);

    await db.transaction(async (tx) => {
        await tx
            .update(instructionParticipants)
            .set({ isActive: false })
            .where(eq(instructionParticipants.instructionId, id));
        await tx.update(instructions).set({ isActive: false }).where(eq(instructions.id, id));
    });
}

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Stellt die offenen Teilnehmer in die Warteschlange — mehr nicht. Verschickt wird im Sweep, und
 * das Bestätigungs-Token entsteht dort: sein Klartext soll ausschliesslich in der Mail existieren,
 * die ihn trägt (§7.3). Hier im Request zu senden, verbietet sich ohnehin — Exchange drosselt und
 * der SWA-Proxy bricht nach 45 s ab.
 */
export async function notifyParticipants(user: SessionUser, id: string): Promise<{ queued: number }> {
    assertManager(user);

    const queued = await db
        .update(instructionParticipants)
        .set({ notifyStatus: 'In Bearbeitung' })
        .where(
            and(
                eq(instructionParticipants.instructionId, id),
                eq(instructionParticipants.isActive, true),
                eq(instructionParticipants.status, 'Offen'),
            ),
        )
        .returning({ id: instructionParticipants.id });

    return { queued: queued.length };
}

export const confirmSchema = z.object({ participantId: z.string().uuid() }).strict();

/** Einen einzelnen Teilnehmer benachrichtigen — ohne Mailadresse gibt es nichts zu tun (§7.3). */
export async function notifyParticipant(
    user: SessionUser,
    instructionId: string,
    participantId: string,
): Promise<void> {
    assertManager(user);

    const [participant] = await db
        .select({ id: instructionParticipants.id, mail: users.mail, status: instructionParticipants.status })
        .from(instructionParticipants)
        .innerJoin(users, eq(users.id, instructionParticipants.userId))
        .where(
            and(
                eq(instructionParticipants.id, participantId),
                eq(instructionParticipants.instructionId, instructionId),
                eq(instructionParticipants.isActive, true),
            ),
        )
        .limit(1);

    if (!participant) throw notFound('Teilnehmer nicht gefunden.');
    if (participant.mail === null) throw badRequest('Für diese Person ist keine E-Mail-Adresse hinterlegt.');
    if (participant.status !== 'Offen') throw badRequest('Diese Person hat bereits geantwortet.');

    await db
        .update(instructionParticipants)
        .set({ notifyStatus: 'In Bearbeitung' })
        .where(eq(instructionParticipants.id, participantId));
}

async function assertConfirmable(instructionId: string, manager: SessionUser): Promise<void> {
    if (!canManageInstructions(manager)) throw forbidden('Bestätigen darf Administration und Bereichsleitung.');

    const [instruction] = await db
        .select({ type: instructions.instructionType })
        .from(instructions)
        .where(and(eq(instructions.id, instructionId), eq(instructions.isActive, true)))
        .limit(1);
    if (!instruction) throw notFound('Unterweisung nicht gefunden.');
    if (instruction.type !== 'Sammel') return;

    const [document] = await db
        .select({ id: instructionDocuments.id })
        .from(instructionDocuments)
        .where(and(eq(instructionDocuments.instructionId, instructionId), eq(instructionDocuments.isActive, true)))
        .limit(1);
    if (!document) {
        throw badRequest('Für eine Sammelunterweisung muss zuerst die unterschriebene Liste hochgeladen werden.');
    }
}

/** Sammelunterweisung: der Verantwortliche bestätigt anhand der hochgeladenen Unterschriftenliste. */
export async function confirmParticipant(user: SessionUser, instructionId: string, participantId: string): Promise<void> {
    await assertConfirmable(instructionId, user);

    const updated = await db
        .update(instructionParticipants)
        .set({ status: 'Bestätigt', confirmedAt: new Date(), confirmTokenHash: null, notifyStatus: 'Fertig' })
        .where(
            and(
                eq(instructionParticipants.id, participantId),
                eq(instructionParticipants.instructionId, instructionId),
                eq(instructionParticipants.isActive, true),
            ),
        )
        .returning({ id: instructionParticipants.id });

    if (updated.length === 0) throw notFound('Teilnehmer nicht gefunden.');
}

export async function confirmAll(user: SessionUser, instructionId: string): Promise<{ confirmed: number }> {
    await assertConfirmable(instructionId, user);

    const updated = await db
        .update(instructionParticipants)
        .set({ status: 'Bestätigt', confirmedAt: new Date(), confirmTokenHash: null, notifyStatus: 'Fertig' })
        .where(
            and(
                eq(instructionParticipants.instructionId, instructionId),
                eq(instructionParticipants.isActive, true),
                eq(instructionParticipants.status, 'Offen'),
            ),
        )
        .returning({ id: instructionParticipants.id });

    return { confirmed: updated.length };
}

/** Der angemeldete Teilnehmer bestätigt selbst — die Karte "Ihre Kenntnisnahme" (§7.3). */
export async function acknowledge(user: SessionUser, instructionId: string): Promise<void> {
    const updated = await db
        .update(instructionParticipants)
        .set({ status: 'Bestätigt', confirmedAt: new Date(), confirmTokenHash: null, notifyStatus: 'Fertig' })
        .where(
            and(
                eq(instructionParticipants.instructionId, instructionId),
                eq(instructionParticipants.userId, user.id),
                eq(instructionParticipants.isActive, true),
            ),
        )
        .returning({ id: instructionParticipants.id });

    if (updated.length === 0) throw notFound('Für dieses Konto gibt es hier keine Unterweisung.');
}
