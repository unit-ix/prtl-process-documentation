import { hasAnyRole, type SessionUser } from '@app/domain';
import { and, eq } from 'drizzle-orm';
import type { Claims } from '../auth/verify.js';
import { db } from '../db/client.js';
import { areas, users, type UserRow } from '../db/schema/index.js';

export interface MeResponse {
    readonly user: SessionUser | null;
    readonly hasAccess: boolean;
}

const toSessionUser = (row: UserRow, ledAreaIds: string[]): SessionUser => ({
    id: row.id,
    entraObjectId: row.entraObjectId,
    displayName: row.displayName,
    mail: row.mail,
    isAuthor: row.isAuthor,
    isProcessOwner: row.isProcessOwner,
    isQm: row.isQm,
    isAdministrator: row.isAdministrator,
    area: row.areaId === null ? null : { id: row.areaId },
    isActive: row.isActive,
    ledAreaIds,
});

export async function me(claims: Claims): Promise<MeResponse> {
    const rows = await db.select().from(users).where(eq(users.entraObjectId, claims.objectId)).limit(1);
    const row = rows[0];
    if (!row || !row.isActive) return { user: null, hasAccess: false };

    const led = await db
        .select({ id: areas.id })
        .from(areas)
        .where(and(eq(areas.processOwnerId, row.id), eq(areas.isActive, true)));
    const user = toSessionUser(
        row,
        led.map((area) => area.id),
    );

    return { user, hasAccess: hasAnyRole(user) };
}
