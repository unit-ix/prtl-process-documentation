// Lese-Scope der Prozessliste, §2.4. Die Rollen sind unabhängige Booleans, ein Nutzer kann mehrere
// tragen — deshalb die Vereinigung der zutreffenden Klauseln und nicht ein Zweig pro Rolle.
import type { SessionUser } from '@app/domain';
import { and, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { processes } from '../db/schema/index.js';

// Inaktive Prozesse sieht nur die Administration (Termin 16.10.2026) — auch QM nicht.
export function readScope(user: SessionUser): SQL | undefined {
    if (user.isAdministrator) return undefined;

    const notDeactivated = isNull(processes.deactivatedAt);
    if (user.isQm) return notDeactivated;

    const clauses: SQL[] = [eq(processes.status, 'approved')];
    if (user.isProcessOwner && user.ledAreaIds.length > 0) {
        clauses.push(inArray(processes.areaId, [...user.ledAreaIds]));
    }
    if (user.isAuthor) clauses.push(eq(processes.authorId, user.id));

    return and(notDeactivated, clauses.length === 1 ? clauses[0] : or(...clauses));
}

/** Darf dieser Nutzer diesen Prozess überhaupt sehen? Dieselbe Klausel wie in der Liste. */
export async function canSeeProcess(user: SessionUser, processId: string): Promise<boolean> {
    const scope = readScope(user);
    const [row] = await db
        .select({ id: processes.id })
        .from(processes)
        .where(and(eq(processes.id, processId), eq(processes.isActive, true), ...(scope ? [scope] : [])))
        .limit(1);
    return row !== undefined;
}
