// Nummernübersicht für die Administration — Lesemodell zu PATCH /processes/:id/number.
import { buildNumberOverview, canChangeNumbers, type NumberArea, type NumberRow, type SessionUser } from '@app/domain';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { areas, processes } from '../db/schema/index.js';
import { forbidden } from '../http/errors.js';

export async function listNumbers(user: SessionUser): Promise<{ items: NumberArea[] }> {
    if (!canChangeNumbers(user)) throw forbidden('Die Nummernübersicht ist der Administration vorbehalten.');

    const [areaRows, rows] = await Promise.all([
        db
            .select({ id: areas.id, title: areas.title, shortCode: areas.shortCode })
            .from(areas)
            .where(eq(areas.isActive, true))
            .orderBy(areas.shortCode),
        db
            .select({
                id: processes.id,
                title: processes.title,
                areaId: processes.areaId,
                parentProcessId: processes.parentProcessId,
                specificationType: processes.specificationType,
                status: processes.status,
                identifier: processes.identifier,
                documentNumber: processes.documentNumber,
                subNumber: processes.subNumber,
            })
            .from(processes)
            .where(eq(processes.isActive, true)),
    ]);

    return { items: buildNumberOverview(areaRows, rows as NumberRow[]) };
}
