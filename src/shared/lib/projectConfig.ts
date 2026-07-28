import projectConfigData from '../../../.unitix/project.json';

/** `mock` = seed-basierter Prototyp (Default), `supabase`/`dataverse` = Forks nach Kunden-OK. */
export type Backend = 'mock' | 'supabase' | 'dataverse';

/** Wo die App gehostet wird. Prototyp-Default: Cloudflare Pages. */
export type Frontend = 'cloudflare' | 'dataverse';

export interface ProjectConfig {
  readonly backend: Backend;
  readonly frontend: Frontend;
}

/** Typisierter Reader für `.unitix/project.json` — Single Source of Truth der Backend-Achse. */
export const projectConfig: ProjectConfig = projectConfigData as ProjectConfig;

export const backend: Backend = projectConfig.backend;

export const frontend: Frontend = projectConfig.frontend;
