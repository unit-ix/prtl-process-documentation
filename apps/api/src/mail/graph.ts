// Versand über Microsoft Graph `sendMail` — der Zielzustand. Kein Secret: das Token holt die
// Managed Identity, dieselbe Mechanik wie bei PostgreSQL, Blob Storage und Azure AI. Ruht, bis
// PRETTL IT die App-Rolle Mail.Send vergeben hat (docs/azure-runbook.md, E-Mail-Versand b).
import { DefaultAzureCredential } from '@azure/identity';
import type { MailMessage } from '@app/domain';
import { mailEnv } from '../env.js';
import { MailRejected, MailUnavailable, type MailTransport } from './transport.js';

const SCOPE = 'https://graph.microsoft.com/.default';
const TIMEOUT_MS = 15_000;

const credential = new DefaultAzureCredential();

export function graphTransport(): MailTransport {
    return {
        name: 'graph',
        async send(message: MailMessage): Promise<void> {
            const { MAIL_SENDER_UPN } = mailEnv();
            const token = await credential.getToken(SCOPE);
            if (!token) throw new MailUnavailable('Kein Graph-Token erhalten.');

            const response = await fetch(
                `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_SENDER_UPN)}/sendMail`,
                {
                    method: 'POST',
                    headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json' },
                    body: JSON.stringify({
                        message: {
                            subject: message.subject,
                            body: { contentType: 'HTML', content: message.html },
                            toRecipients: [{ emailAddress: { address: message.to } }],
                        },
                        // Der Versandnachweis liegt damit in Exchange und nicht nur in unserem Log.
                        saveToSentItems: true,
                    }),
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                },
            );

            if (response.ok) return;

            const detail = (await response.text().catch(() => '')).slice(0, 300);
            // 429 ist Drosselung (~30 Mails/Minute je Postfach) und ausdrücklich kein Fehler,
            // sondern ein Hinweis, es später noch einmal zu versuchen.
            if (response.status === 429 || response.status >= 500) {
                throw new MailUnavailable(`Graph ${response.status}: ${detail}`);
            }
            throw new MailRejected(`Graph ${response.status}: ${detail}`);
        },
    };
}
