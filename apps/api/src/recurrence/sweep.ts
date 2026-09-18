// Läuft unabhängig vom Mail-Versand: der Turnus muss auch dann weiterlaufen, wenn noch kein
// Versandweg konfiguriert ist — die Runde entsteht, die Mails warten in der Warteschlange.
import { withAdvisoryLock } from '../db/advisoryLock.js';
import { openNextRounds } from './openNextRounds.js';

const INTERVAL_MS = 6 * 60 * 60_000;
const LOCK_KEY = 'prtl.recurrence.sweep';

/** Heute als ISO-Tag. Die Regel selbst kennt keine Uhr — sie bekommt den Tag übergeben. */
const today = (): string => new Date().toISOString().slice(0, 10);

export async function runRecurrenceSweep(): Promise<void> {
    const result = await withAdvisoryLock(LOCK_KEY, () => openNextRounds(today()));
    if (result !== null && result.opened > 0) {
        console.log(`[unterweisung] ${result.opened} Folgerunde(n) geöffnet.`);
    }
}

export function startRecurrenceSweep(): void {
    console.log(`[unterweisung] Turnus-Sweep aktiv, alle ${INTERVAL_MS / 3_600_000} h.`);
    const tick = (): void => {
        void runRecurrenceSweep().catch((error: unknown) => {
            console.error('[unterweisung] Turnus-Sweep fehlgeschlagen:', error instanceof Error ? error.message : error);
        });
    };
    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    timer.unref();
}
