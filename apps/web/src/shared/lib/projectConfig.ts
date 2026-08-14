import projectConfigData from '@unitix/project.json';

/** `mock` = seed-based prototype (default), `supabase`/`dataverse` = forks after customer sign-off. */
export type Backend = 'mock' | 'supabase' | 'dataverse';

/** Where the app is hosted. Prototype default: Cloudflare Pages. */
export type Frontend = 'cloudflare' | 'powerapps';

export interface ProjectConfig {
  readonly backend: Backend;
  readonly frontend: Frontend;
}

/** Typed reader for `.unitix/project.json` — single source of truth for the backend axis. */
export const projectConfig: ProjectConfig = projectConfigData as ProjectConfig;

export const backend: Backend = projectConfig.backend;

export const frontend: Frontend = projectConfig.frontend;
