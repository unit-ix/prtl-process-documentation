// Läuft wie der Mail-Sweep im Always-On-App-Service. Wer in die Gruppe kommt, steht spätestens nach
// einem Intervall in der App; der Knopf in den Einstellungen stösst den Lauf sofort an.
import { canSeeSettings, type SessionUser } from '@app/domain';
import { inArray } from 'drizzle-orm';
import { withAdvisoryLock } from '../db/advisoryLock.js';
import { db } from '../db/client.js';
import { users } from '../db/schema/index.js';
import { serverEnv } from '../env.js';
import { ApiError, badRequest, forbidden } from '../http/errors.js';
import { DirectoryUnavailable, fetchGroupMembers } from './groupMembers.js';
import { planUserSync } from './planUserSync.js';

const INTERVAL_MS = 10 * 60_000;
const LOCK_KEY = 'prtl.users.sync';

interface SyncResult {
    readonly created: number;
    readonly reactivated: number;
    readonly deactivated: number;
}

async function applyUserSync(groupId: string): Promise<SyncResult> {
    const members = await fetchGroupMembers(groupId);
    const known = await db
        .select({ id: users.id, entraObjectId: users.entraObjectId, isActive: users.isActive })
        .from(users);
    const plan = planUserSync(members, known, serverEnv().ENTRA_SYNC_IGNORE_IDS);

    await db.transaction(async (tx) => {
        if (plan.create.length > 0) {
            await tx.insert(users).values([...plan.create]).onConflictDoNothing({ target: users.entraObjectId });
        }
        if (plan.reactivate.length > 0) {
            await tx.update(users).set({ isActive: true }).where(inArray(users.id, [...plan.reactivate]));
        }
        if (plan.deactivate.length > 0) {
            await tx.update(users).set({ isActive: false }).where(inArray(users.id, [...plan.deactivate]));
        }
    });

    return { created: plan.create.length, reactivated: plan.reactivate.length, deactivated: plan.deactivate.length };
}

const summary = (result: SyncResult): string =>
    `${result.created} neu, ${result.reactivated} wieder aufgenommen, ${result.deactivated} deaktiviert`;

export async function syncUsersNow(user: SessionUser): Promise<{ toast: string }> {
    if (!canSeeSettings(user)) throw forbidden('Der Abgleich ist Administration und QM vorbehalten.');
    const groupId = serverEnv().ENTRA_USER_GROUP_ID;
    if (groupId === undefined) throw badRequest('Es ist keine Benutzergruppe konfiguriert (ENTRA_USER_GROUP_ID).');

    try {
        const result = await withAdvisoryLock(LOCK_KEY, () => applyUserSync(groupId));
        return { toast: result === null ? 'Der Abgleich läuft gerade schon.' : `Abgleich fertig: ${summary(result)}.` };
    } catch (error) {
        if (error instanceof DirectoryUnavailable) throw new ApiError(503, 'directory_unavailable', error.message);
        throw error;
    }
}

export function startUserSync(): void {
    const groupId = serverEnv().ENTRA_USER_GROUP_ID;
    if (groupId === undefined) {
        console.log('[benutzer] Keine Gruppe konfiguriert (ENTRA_USER_GROUP_ID) — kein Abgleich.');
        return;
    }

    console.log(`[benutzer] Abgleich mit der Entra-Gruppe aktiv, alle ${INTERVAL_MS / 60_000} min.`);
    const tick = (): void => {
        void withAdvisoryLock(LOCK_KEY, () => applyUserSync(groupId))
            .then((result) => {
                if (result && result.created + result.reactivated + result.deactivated > 0) {
                    console.log(`[benutzer] Abgleich: ${summary(result)}.`);
                }
            })
            .catch((error: unknown) => {
                console.error('[benutzer] Abgleich fehlgeschlagen:', error instanceof Error ? error.message : error);
            });
    };
    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    timer.unref();
}
