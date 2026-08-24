// Named Imports: was die SPA aus project.json liest, steht damit in einer Zeile.
import { platform as platformValue, entra as entraValue } from '@unitix/project.json';

/**
 * Zielplattform — die eine Achse, an der Datenadapter, Regelsatz und Host hängen. Ein Feld statt
 * zwei, weil die Zuordnung zum Host 1:1 ist: `mock` → Cloudflare Pages, `azure` → Static Web Apps,
 * `powerapps` → Power Platform. `mock` ist der Default eines frisch geklonten Templates.
 */
export type Platform = 'mock' | 'azure' | 'powerapps';

/**
 * Entra-App-Registrierung, nur bei `platform: azure` gefüllt. Committet statt in einer `.env`, weil
 * alle Werte öffentliche Identifikatoren sind — sie benennen die Anwendung, sie autorisieren nichts.
 * Ein Secret gehört NIE hier hinein.
 *
 * Umgebungs-neutral und deshalb NICHT im `environments`-Block: Dev und Prod teilen eine
 * Registrierung, sonst wäre ein Build-Artefakt nur für eine Umgebung gültig (docs/environments.md).
 *
 * Jeder Wert heisst wie seine Azure-Umgebungsvariable (`tenantId` → `ENTRA_TENANT_ID`).
 */
export interface EntraConfig {
    /** Verzeichnis-id des Mandanten, bildet die Authority. */
    readonly tenantId: string;
    /** Client-id der SPA-App-Registrierung. */
    readonly clientId: string;
    /** Client-id der API-App-Registrierung: erwarteter `aud`, und `auth.ts` baut den Scope daraus. */
    readonly apiAudience: string;
    /**
     * Optional. Leer = workforce Entra ID (`login.microsoftonline.com/<tenantId>`). Gesetzt = Entra
     * External ID (CIAM) — die `ciamlogin.com`-Subdomain des externen Mandanten, z. B. `contoso` für
     * `contoso.ciamlogin.com`. Authority wird daraus automatisch gebildet, siehe
     * [`auth.ts`](../../data/adapters/azure/auth.ts). Siehe docs/azure-setup.md, „Optional: Entra
     * External ID statt Entra ID".
     */
    readonly subdomain?: string;
}

export const platform: Platform = platformValue as Platform;

export const entra: EntraConfig = entraValue as EntraConfig;
