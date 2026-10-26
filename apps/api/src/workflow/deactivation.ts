import { canDeactivateProcess, type SessionUser } from '@app/domain';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { processes } from '../db/schema/index.js';
import { notFound } from '../http/errors.js';
import { assertAllowed } from './context.js';

export async function setProcessDeactivated(
    user: SessionUser,
    processId: string,
    deactivated: boolean,
): Promise<{ toast: string }> {
    assertAllowed(canDeactivateProcess(user));

    const [row] = await db
        .update(processes)
        .set({ deactivatedAt: deactivated ? new Date() : null })
        .where(and(eq(processes.id, processId), eq(processes.isActive, true)))
        .returning({ id: processes.id });
    if (!row) throw notFound('Prozess nicht gefunden.');

    return {
        toast: deactivated
            ? 'Prozess ist inaktiv und nur noch für die Administration sichtbar.'
            : 'Prozess ist wieder aktiv.',
    };
}
