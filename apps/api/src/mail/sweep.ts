// Der Sweep läuft IM Always-On-App-Service, nicht als Azure Function: B1 hat keinen Cron, und eine
// Consumption-Function hätte keine feste Outbound-IP — die DB-Firewall arbeitet aber genau damit.
//
// Zustandsgetrieben, nicht uhrgetrieben: gesucht wird „was ist offen", nie „was war um 8 Uhr
// fällig". Ein Tick, der durch einen Neustart ausfällt — und auf B1 ist jedes Deployment ein
// Neustart — wird vom nächsten einfach mit erledigt.
import { withAdvisoryLock } from '../db/advisoryLock.js';
import { mailTransportName } from '../env.js';
import { graphTransport } from './graph.js';
import { drainOutbox } from './outbox.js';
import { powerAutomateTransport } from './powerAutomate.js';
import type { MailTransport } from './transport.js';

const INTERVAL_MS = 60_000;
const LOCK_KEY = 'prtl.mail.sweep';

export function selectTransport(): MailTransport | null {
    switch (mailTransportName()) {
        case 'graph':
            return graphTransport();
        case 'powerAutomate':
            return powerAutomateTransport();
        // 'none': die Zeilen bleiben stehen, bis ein Weg da ist — sie werden NICHT als gesendet
        // markiert, sonst wäre die Warteschlange still leer statt sichtbar unbearbeitet.
        default:
            return null;
    }
}

export async function runMailSweep(): Promise<void> {
    const transport = selectTransport();
    if (transport === null) return;

    const result = await withAdvisoryLock(LOCK_KEY, () => drainOutbox(transport));
    if (result === null) return;
    if (result.sent > 0 || result.failed > 0) {
        console.log(`[mail] ${transport.name}: ${result.sent} gesendet, ${result.failed} offen/fehlerhaft`);
    }
}

export function startMailSweep(): void {
    const transport = selectTransport();
    if (transport === null) {
        console.log('[mail] Kein Versandweg konfiguriert (MAIL_TRANSPORT=none) — Mails bleiben in der Warteschlange.');
        return;
    }

    console.log(`[mail] Sweep aktiv, Versand über ${transport.name}, alle ${INTERVAL_MS / 1000} s.`);
    const timer = setInterval(() => {
        void runMailSweep().catch((error: unknown) => {
            console.error('[mail] Sweep fehlgeschlagen:', error instanceof Error ? error.message : error);
        });
    }, INTERVAL_MS);
    timer.unref();
}
