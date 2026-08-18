import projectConfigData from '@unitix/project.json';

/** `mock` = seed-based prototype (default), `azure`/`dataverse` = forks after customer sign-off. */
export type Backend = 'mock' | 'azure' | 'dataverse';

/**
 * Where the SPA is hosted. Prototype default: Cloudflare Pages.
 * `swa` = Azure Static Web Apps — the only host that proxies `/api/*` to the App Service.
 */
export type Frontend = 'cloudflare' | 'swa' | 'powerapps';

/**
 * Entra-App-Registrierung, nur bei `backend: azure` gefüllt (im Template leer). Committet statt in
 * einer `.env`, weil alle drei Werte öffentliche Identifikatoren sind — sie benennen die Anwendung,
 * sie autorisieren nichts. Ein Secret gehört NIE hier hinein.
 */
export interface EntraConfig {
    /** Verzeichnis-id des Mandanten, bildet die Authority. */
    readonly tenantId: string;
    /** Client-id der SPA-App-Registrierung. */
    readonly clientId: string;
    /** Scope der API-App-Registrierung, z. B. `api://<api-client-id>/access_as_user`. */
    readonly apiScope: string;
    /**
     * Optional. Leer = workforce Entra ID (`login.microsoftonline.com/<tenantId>`). Gesetzt = Entra
     * External ID (CIAM) — die `ciamlogin.com`-Subdomain des externen Mandanten, z. B. `contoso` für
     * `contoso.ciamlogin.com`. Authority wird daraus automatisch gebildet, siehe
     * [`auth.ts`](../../data/adapters/azure/auth.ts). Siehe docs/azure-setup.md, „Optional: Entra
     * External ID statt Entra ID".
     */
    readonly subdomain?: string;
}

export interface ProjectConfig {
    readonly backend: Backend;
    readonly frontend: Frontend;
    readonly entra: EntraConfig;
}

/** Typed reader for `.unitix/project.json` — single source of truth for the backend axis. */
export const projectConfig: ProjectConfig = projectConfigData as ProjectConfig;

export const backend: Backend = projectConfig.backend;

export const frontend: Frontend = projectConfig.frontend;

export const entra: EntraConfig = projectConfig.entra;
