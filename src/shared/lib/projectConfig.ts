import projectConfigData from '../../../.unitix/project.json';

/**
 * Die Target-Achse eines Prototype-First-Projekts.
 * `mock` = seed-basierter Prototyp (Default eines frischen Templates),
 * `supabase`/`dataverse` = Forks nach Kunden-OK. Siehe Data-Seam (`src/data/`).
 */
export type Target = 'mock' | 'supabase' | 'dataverse';

/** Wo der Prototyp gehostet wird. Prototyp-Default: Cloudflare Pages. */
export type Hosting = 'cloudflare' | 'dataverse';

export interface ProjectConfig {
  readonly target: Target;
  readonly hosting: Hosting;
}

/**
 * Typisierter ESM-Reader für `.unitix/project.json` — die Single Source of Truth
 * der Target-Achse. Bewusst kein `require()`: dieses Repo ist ESM. Der Import
 * wird von Vite (Bundle) und `tsc` (resolveJsonModule) gleichermaßen aufgelöst.
 */
export const projectConfig: ProjectConfig = projectConfigData as ProjectConfig;

/** Bequemer Direktzugriff auf das aktive Target. */
export const target: Target = projectConfig.target;

/** Bequemer Direktzugriff auf das aktive Hosting. */
export const hosting: Hosting = projectConfig.hosting;
