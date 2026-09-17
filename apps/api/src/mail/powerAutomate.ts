// Übergangsweg, bis PRETTL IT die Graph-Rolle Mail.Send vergeben hat. Der Flow ist reiner
// Briefträger: er bekommt Empfänger, Betreff und fertiges HTML und hat nichts zu entscheiden.
// Geschrieben wird weiterhin ausschliesslich über unsere API — die Bestätigung aus der Mail geht
// gegen /api/confirm/{token}, nicht über einen Datenbank-Connector. Begründung: docs/mail-flow.md.
import type { MailMessage } from '@app/domain';
import { mailFlowEnv } from '../env.js';
import { MailRejected, MailUnavailable, type MailTransport } from './transport.js';

const TIMEOUT_MS = 20_000;

export function powerAutomateTransport(): MailTransport {
    return {
        name: 'powerAutomate',
        async send(message: MailMessage): Promise<void> {
            const { MAIL_FLOW_URL, MAIL_FLOW_SECRET } = mailFlowEnv();

            const response = await fetch(MAIL_FLOW_URL, {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-prtl-secret': MAIL_FLOW_SECRET },
                body: JSON.stringify({ to: message.to, subject: message.subject, html: message.html }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });

            if (response.ok) return;

            const detail = (await response.text().catch(() => '')).slice(0, 300);
            // 401 heisst: falsches Geheimnis — das ist ein Konfigurationsfehler und kein Grund,
            // die Zeile als dauerhaft unzustellbar abzuschreiben.
            if (response.status === 401 || response.status === 429 || response.status >= 500) {
                throw new MailUnavailable(`Flow ${response.status}: ${detail}`);
            }
            throw new MailRejected(`Flow ${response.status}: ${detail}`);
        },
    };
}
