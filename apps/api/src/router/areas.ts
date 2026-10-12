import type { AreaRef } from '@app/domain';
import { asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { areas, processes, users } from '../db/schema/index.js';

export interface AreaListItem extends AreaRef {
    processOwner: { id: string; displayName: string } | null;
    isActive: boolean;
    /** Ein Dokument des Bereichs hat ein Kennzeichen — dann stecken Kürzel und Kategorie darin. */
    isNumbered: boolean;
}

// Die Auswahllisten (Anlegen, Filter, Benutzer) sehen nur aktive Bereiche; die Einstellungen alle,
// sonst ließe sich ein deaktivierter Bereich nie wieder einschalten.
export async function listAreas(options: { includeInactive?: boolean } = {}): Promise<{ items: AreaListItem[] }> {
    const numbered = db
        .selectDistinct({ areaId: processes.areaId })
        .from(processes)
        .where(isNotNull(processes.identifier))
        .as('numbered');

    const rows = await db
        .select({
            id: areas.id,
            title: areas.title,
            shortCode: areas.shortCode,
            categoryNumber: areas.categoryNumber,
            isActive: areas.isActive,
            numberedAreaId: numbered.areaId,
            ownerId: users.id,
            ownerName: users.displayName,
        })
        .from(areas)
        .leftJoin(users, eq(users.id, areas.processOwnerId))
        .leftJoin(numbered, eq(numbered.areaId, areas.id))
        .where(options.includeInactive ? undefined : eq(areas.isActive, true))
        .orderBy(asc(sql`${areas.title} collate "de-DE-x-icu"`));

    return {
        items: rows.map((row) => ({
            id: row.id,
            title: row.title,
            shortCode: row.shortCode,
            categoryNumber: row.categoryNumber,
            isActive: row.isActive,
            isNumbered: row.numberedAreaId !== null,
            processOwner: row.ownerId && row.ownerName ? { id: row.ownerId, displayName: row.ownerName } : null,
        })),
    };
}
