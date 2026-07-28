import projectConfigData from '../../../.unitix/project.json';

/**
 * Die Backend-Achse eines Prototype-First-Projekts.
 * `mock` = seed-basierter Prototyp (Default eines frischen Templates),
 * `supabase`/`dataverse` = Forks nach Kunden-OK. Siehe Data-Seam (`src/data/`).
 */
export type Backend = 'mock' | 'supabase' | 'dataverse';

/** Wo der Prototyp gehostet wird. Prototyp-Default: Cloudflare Pages. */
export type Frontend = 'cloudflare' | 'dataverse';

export interface ProjectConfig {
  readonly backend: Backend;
  readonly frontend: Frontend;
}

/**
 * Typisierter ESM-Reader für `.unitix/project.json` — die Single Source of Truth
 * der Backend-Achse. Bewusst kein `require()`: dieses Repo ist ESM. Der Import
 * wird von Vite (Bundle) und `tsc` (resolveJsonModule) gleichermaßen aufgelöst.
 */
export const projectConfig: ProjectConfig = projectConfigData as ProjectConfig;

/** Bequemer Direktzugriff auf das aktive Backend. */
export const backend: Backend = projectConfig.backend;

/** Bequemer Direktzugriff auf das aktive Frontend. */
export const frontend: Frontend = projectConfig.frontend;
