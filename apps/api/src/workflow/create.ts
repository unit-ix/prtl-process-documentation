import { canCreateProcess, mayDeleteProcess, type ProcessStatus, type SessionUser } from '@app/domain';
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
import { assertAllowed, type Tx } from './context.js';

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
// Seit der Testauswertung vom 09.10. trägt sie die Nummer ihrer VA (OM.001_01) — deshalb liegt sie
// im selben Bereich, sonst stünde ein fremdes Bereichskürzel in ihrem Kennzeichen.
export async function assertParentProcess(reader: typeof db | Tx, parentProcessId: string, areaId: string): Promise<void> {
    const [parent] = await reader
        .select({ specificationType: processes.specificationType, areaId: processes.areaId })
        .from(processes)
        .where(and(eq(processes.id, parentProcessId), eq(processes.isActive, true)))
        .limit(1);

    if (!parent) throw notFound('Übergeordneter Prozess nicht gefunden.');
    if (parent.specificationType !== 'VA') {
        throw badRequest('Übergeordnet kann nur eine Verfahrensanweisung sein.');
    }
    if (parent.areaId !== areaId) {
        throw badRequest('Eine Arbeitsanweisung liegt im Bereich ihrer Verfahrensanweisung — sie trägt deren Nummer.');
    }
}

async function assertParent(input: CreateProcessInput): Promise<string | null> {
    if (!input.parentProcessId) return null;
    if (input.specificationType !== 'AA') {
        throw badRequest('Eine übergeordnete Verfahrensanweisung gibt es nur für eine Arbeitsanweisung.');
    }
    await assertParentProcess(db, input.parentProcessId, input.areaId);
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

// T8 — Soft-Delete mit Kaskade. Canvas verwaist die Kinder (§12, Defekt 21). Ein inaktiver
// Prozess darf auch nach der Freigabe weg, aber nur durch die Administration (Wunsch 30.10.) —
// danach sieht ihn auch die Administration nicht mehr. Unterweisungen dazu bleiben als Nachweis.
export async function deleteProcess(user: SessionUser, processId: string): Promise<void> {
    const [process] = await db
        .select({ status: processes.status, areaId: processes.areaId, deactivatedAt: processes.deactivatedAt })
        .from(processes)
        .where(and(eq(processes.id, processId), eq(processes.isActive, true)))
        .limit(1);
    if (!process) throw notFound('Prozess nicht gefunden.');

    const shape = { status: process.status as ProcessStatus, area: { id: process.areaId }, deactivatedAt: process.deactivatedAt?.toISOString() ?? null };
    if (process.deactivatedAt === null && process.status !== 'backlog' && process.status !== 'in_capture') {
        throw badRequest('Nur Prozesse im Backlog oder in Erfassung oder inaktive Prozesse können gelöscht werden.');
    }
    assertAllowed(mayDeleteProcess(user, shape));

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
