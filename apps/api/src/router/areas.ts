import type { AreaRef } from '@app/domain';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { areas, users } from '../db/schema/index.js';

export interface AreaListItem extends AreaRef {
    processOwner: { id: string; displayName: string } | null;
}

export async function listAreas(): Promise<{ items: AreaListItem[] }> {
    const rows = await db
        .select({
            id: areas.id,
            title: areas.title,
            shortCode: areas.shortCode,
            categoryNumber: areas.categoryNumber,
            ownerId: users.id,
            ownerName: users.displayName,
        })
        .from(areas)
        .leftJoin(users, eq(users.id, areas.processOwnerId))
        .where(eq(areas.isActive, true))
        .orderBy(asc(sql`${areas.title} collate "de-DE-x-icu"`));

    return {
        items: rows.map((row) => ({
            id: row.id,
            title: row.title,
            shortCode: row.shortCode,
            categoryNumber: row.categoryNumber,
            processOwner: row.ownerId && row.ownerName ? { id: row.ownerId, displayName: row.ownerName } : null,
        })),
    };
}
