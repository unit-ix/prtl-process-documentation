// §9.7 — Einstellungen. Beides nur für Administration und QM; `displayName`, `mail` und die
// Entra-Id kommen aus der Provisionierung und sind hier nicht änderbar.
import { canSeeQualifications, canSeeSettings, type SessionUser } from '@app/domain';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { areas, qualifications, users, userTasks } from '../db/schema/index.js';
import { badRequest, forbidden, notFound } from '../http/errors.js';

const assertSettings = (user: SessionUser): void => {
    if (!canSeeSettings(user)) throw forbidden('Einstellungen sind Administration und QM vorbehalten.');
};

export const areaUpdateSchema = z.object({ processOwnerId: z.string().uuid().nullable() }).strict();

export async function updateArea(user: SessionUser, id: string, input: z.infer<typeof areaUpdateSchema>): Promise<void> {
    assertSettings(user);

    const updated = await db
        .update(areas)
        .set({ processOwnerId: input.processOwnerId })
        .where(and(eq(areas.id, id), eq(areas.isActive, true)))
        .returning({ id: areas.id });
    if (updated.length === 0) throw notFound('Bereich nicht gefunden.');
}

export const userUpdateSchema = z
    .object({
        isAuthor: z.boolean().optional(),
        isProcessOwner: z.boolean().optional(),
        isQm: z.boolean().optional(),
        isAdministrator: z.boolean().optional(),
        areaId: z.string().uuid().nullable().optional(),
    })
    .strict();

export async function updateUser(user: SessionUser, id: string, input: z.infer<typeof userUpdateSchema>): Promise<void> {
    assertSettings(user);
    if (Object.keys(input).length === 0) throw badRequest('Keine Felder zum Ändern.');

    const updated = await db
        .update(users)
        .set(input)
        .where(and(eq(users.id, id), eq(users.isActive, true)))
        .returning({ id: users.id });
    if (updated.length === 0) throw notFound('Mitarbeiter nicht gefunden.');
}

async function assertMayManage(user: SessionUser, employeeId: string): Promise<void> {
    const [employee] = await db
        .select({ areaId: users.areaId })
        .from(users)
        .where(and(eq(users.id, employeeId), eq(users.isActive, true)))
        .limit(1);
    if (!employee) throw notFound('Mitarbeiter nicht gefunden.');

    const allowed = canSeeQualifications(user, {
        area: employee.areaId === null ? null : { id: employee.areaId },
    });
    if (!allowed) throw forbidden('Nur Administration und der Prozessverantwortliche des Bereichs.');
}

export const qualificationSchema = z
    .object({
        userId: z.string().uuid(),
        title: z.string().trim().min(1).max(400),
        description: z.string().trim().max(4000).nullish(),
        acquiredAt: z.string().date().nullish(),
        expiresAt: z.string().date().nullish(),
        skillPoints: z.number().int().min(1).max(4).nullish(),
    })
    .strict();

export async function saveQualification(
    user: SessionUser,
    input: z.infer<typeof qualificationSchema>,
    id?: string,
): Promise<{ id: string }> {
    await assertMayManage(user, input.userId);

    const values = {
        userId: input.userId,
        title: input.title,
        description: input.description ?? null,
        acquiredAt: input.acquiredAt ?? null,
        expiresAt: input.expiresAt ?? null,
        skillPoints: input.skillPoints ?? null,
        // §7.7: eine verlängerte Qualifikation muss wieder erinnert werden können — Canvas setzt
        // das Flag nie zurück und schweigt danach für immer (§12, Defekt 16).
        reminderSentAt: null,
    };

    if (id === undefined) {
        const [row] = await db.insert(qualifications).values(values).returning({ id: qualifications.id });
        return row;
    }

    const [row] = await db
        .update(qualifications)
        .set(values)
        .where(and(eq(qualifications.id, id), eq(qualifications.isActive, true)))
        .returning({ id: qualifications.id });
    if (!row) throw notFound('Qualifikation nicht gefunden.');
    return row;
}

export async function deleteQualification(user: SessionUser, id: string): Promise<void> {
    const [row] = await db
        .select({ userId: qualifications.userId })
        .from(qualifications)
        .where(eq(qualifications.id, id))
        .limit(1);
    if (!row) throw notFound('Qualifikation nicht gefunden.');

    await assertMayManage(user, row.userId);
    await db.update(qualifications).set({ isActive: false }).where(eq(qualifications.id, id));
}

export const taskSchema = z
    .object({
        userId: z.string().uuid(),
        title: z.string().trim().min(1).max(400),
        description: z.string().trim().max(4000).nullish(),
    })
    .strict();

export async function saveTask(
    user: SessionUser,
    input: z.infer<typeof taskSchema>,
    id?: string,
): Promise<{ id: string }> {
    await assertMayManage(user, input.userId);
    const values = { userId: input.userId, title: input.title, description: input.description ?? null };

    if (id === undefined) {
        const [row] = await db.insert(userTasks).values(values).returning({ id: userTasks.id });
        return row;
    }

    const [row] = await db
        .update(userTasks)
        .set(values)
        .where(and(eq(userTasks.id, id), eq(userTasks.isActive, true)))
        .returning({ id: userTasks.id });
    if (!row) throw notFound('Aufgabe nicht gefunden.');
    return row;
}

export async function deleteTask(user: SessionUser, id: string): Promise<void> {
    const [row] = await db.select({ userId: userTasks.userId }).from(userTasks).where(eq(userTasks.id, id)).limit(1);
    if (!row) throw notFound('Aufgabe nicht gefunden.');

    await assertMayManage(user, row.userId);
    await db.update(userTasks).set({ isActive: false }).where(eq(userTasks.id, id));
}
