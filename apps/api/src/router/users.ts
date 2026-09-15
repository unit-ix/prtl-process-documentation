import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema/index.js';

export interface UserListItem {
    id: string;
    displayName: string;
    mail: string | null;
    isAuthor: boolean;
    isProcessOwner: boolean;
    isQm: boolean;
    isAdministrator: boolean;
    area: { id: string } | null;
}

export async function listUsers(): Promise<{ items: UserListItem[] }> {
    const rows = await db
        .select()
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(asc(sql`${users.displayName} collate "de-DE-x-icu"`));

    return {
        items: rows.map((row) => ({
            id: row.id,
            displayName: row.displayName,
            mail: row.mail,
            isAuthor: row.isAuthor,
            isProcessOwner: row.isProcessOwner,
            isQm: row.isQm,
            isAdministrator: row.isAdministrator,
            area: row.areaId === null ? null : { id: row.areaId },
        })),
    };
}
