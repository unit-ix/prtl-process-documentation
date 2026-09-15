// Lese-Scope der Prozessliste, §2.4. Die Rollen sind unabhängige Booleans, ein Nutzer kann mehrere
// tragen — deshalb die Vereinigung der zutreffenden Klauseln und nicht ein Zweig pro Rolle.
import type { SessionUser } from '@app/domain';
import { eq, inArray, or, type SQL } from 'drizzle-orm';
import { processes } from '../db/schema/index.js';

export function readScope(user: SessionUser): SQL | undefined {
    if (user.isAdministrator || user.isQm) return undefined;

    const clauses: SQL[] = [eq(processes.status, 'approved')];
    if (user.isProcessOwner && user.ledAreaIds.length > 0) {
        clauses.push(inArray(processes.areaId, [...user.ledAreaIds]));
    }
    if (user.isAuthor) clauses.push(eq(processes.authorId, user.id));

    return clauses.length === 1 ? clauses[0] : or(...clauses);
}
