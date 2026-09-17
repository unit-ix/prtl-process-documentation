import type { MailMessage } from '@app/domain';

/**
 * Der letzte Zoll des Versands. Alles davor — Warteschlange, Vorlagen, Zustandsrückschreibung,
 * Wiederholung — gehört uns und ist für jeden Transport identisch (docs/azure-runbook.md,
 * E-Mail-Versand). Ein Wechsel von Power Automate auf Graph ist deshalb ein Konfigurationswert.
 */
export interface MailTransport {
    readonly name: string;
    send(message: MailMessage): Promise<void>;
}

/** Fachlich abgelehnt (falsche Adresse, Postfach gesperrt) — ein erneuter Versuch hilft nicht. */
export class MailRejected extends Error {}

/** Vorübergehend (Drosselung, Netz, Dienst weg) — beim nächsten Sweep noch einmal versuchen. */
export class MailUnavailable extends Error {}
