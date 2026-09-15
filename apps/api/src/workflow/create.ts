import { canCreateProcess, type SessionUser } from '@app/domain';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
    areas,
    processAdditionalFields,
    processDocuments,
    processes,
    processLinks,
    processVersions,
} from '../db/schema/index.js';
import { badRequest, notFound } from '../http/errors.js';
import { assertAllowed } from './context.js';

export const createProcessSchema = z
    .object({
        title: z.string().trim().min(1).max(400),
        shortDescription: z.string().trim().max(4000).nullish(),
        areaId: z.string().uuid(),
        specificationType: z.enum(['VA', 'AA']),
        templateType: z.enum(['IMS', 'PROD']),
        scope: z.enum(['PE', 'PER', 'PEL']).nullish(),
        parentProcessId: z.string().uuid().nullish(),
        confidentiality: z.enum(['Öffentlich', 'Intern', 'Vertraulich']).nullish(),
    })
    .strict();

export type CreateProcessInput = z.infer<typeof createProcessSchema>;

// §6: ein Elternteil gibt es nur für eine AA, und er muss eine VA sein. Eine AA darf allein stehen.
async function assertParent(input: CreateProcessInput): Promise<string | null> {
    if (!input.parentProcessId) return null;
    if (input.specificationType !== 'AA') {
        throw badRequest('Eine übergeordnete Verfahrensanweisung gibt es nur für eine Arbeitsanweisung.');
    }

    const [parent] = await db
        .select({ specificationType: processes.specificationType })
        .from(processes)
        .where(and(eq(processes.id, input.parentProcessId), eq(processes.isActive, true)))
        .limit(1);

    if (!parent) throw notFound('Übergeordneter Prozess nicht gefunden.');
    if (parent.specificationType !== 'VA') {
        throw badRequest('Übergeordnet kann nur eine Verfahrensanweisung sein.');
    }
    return input.parentProcessId;
}

export async function createProcess(user: SessionUser, input: CreateProcessInput): Promise<{ id: string }> {
    assertAllowed(canCreateProcess(user));
    const parentProcessId = await assertParent(input);

    const [area] = await db
        .select({ id: areas.id })
        .from(areas)
        .where(and(eq(areas.id, input.areaId), eq(areas.isActive, true)))
        .limit(1);
    if (!area) throw notFound('Bereich nicht gefunden.');

    return db.transaction(async (tx) => {
        const [process] = await tx
            .insert(processes)
            .values({
                title: input.title,
                shortDescription: input.shortDescription ?? null,
                areaId: input.areaId,
                specificationType: input.specificationType,
                templateType: input.templateType,
                scope: input.scope ?? null,
                confidentiality: input.confidentiality ?? null,
                parentProcessId,
                status: 'backlog',
                hasActiveDraft: true,
            })
            .returning({ id: processes.id });

        const [version] = await tx
            .insert(processVersions)
            .values({ processId: process.id, status: 'backlog' })
            .returning({ id: processVersions.id });

        await tx.update(processes).set({ currentVersionId: version.id }).where(eq(processes.id, process.id));

        return { id: process.id };
    });
}

// T8 — Soft-Delete mit Kaskade. Canvas verwaist die Kinder (§12, Defekt 21).
export async function deleteProcess(user: SessionUser, processId: string): Promise<void> {
    const [process] = await db
        .select({ status: processes.status, areaId: processes.areaId })
        .from(processes)
        .where(and(eq(processes.id, processId), eq(processes.isActive, true)))
        .limit(1);
    if (!process) throw notFound('Prozess nicht gefunden.');

    assertAllowed(user.isAdministrator || (user.isProcessOwner && user.ledAreaIds.includes(process.areaId)));
    if (process.status !== 'backlog' && process.status !== 'in_capture') {
        throw badRequest('Nur Prozesse im Backlog oder in Erfassung können gelöscht werden.');
    }

    await db.transaction(async (tx) => {
        const versions = await tx
            .select({ id: processVersions.id })
            .from(processVersions)
            .where(eq(processVersions.processId, processId));
        const versionIds = versions.map((version) => version.id);

        if (versionIds.length > 0) {
            await tx
                .update(processAdditionalFields)
                .set({ isActive: false })
                .where(inArray(processAdditionalFields.processVersionId, versionIds));
            await tx.update(processLinks).set({ isActive: false }).where(inArray(processLinks.processVersionId, versionIds));
            await tx.update(processVersions).set({ isActive: false }).where(eq(processVersions.processId, processId));
        }

        await tx.update(processDocuments).set({ isActive: false }).where(eq(processDocuments.processId, processId));
        await tx.update(processes).set({ isActive: false }).where(eq(processes.id, processId));
    });
}
