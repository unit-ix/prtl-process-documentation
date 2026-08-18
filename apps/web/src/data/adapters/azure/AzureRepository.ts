// EINE Implementierung für alle Entitäten, Gegenstück zu apps/api/src/router/registry.ts.
import type { Page } from '../../ports/Query';
import type { Repository } from '../../ports/Repository';
import { apiDelete, apiGet, apiGetOrNull, apiSend } from './client';
import { toSearchParams, type AnyListQuery } from './query';

export class AzureRepository<TEntity, TCreate, TQuery extends AnyListQuery>
    implements Repository<TEntity, TCreate, TQuery>
{
    /** @param resource Pfadsegment der API, gleichbedeutend mit dem Tabellennamen (`contacts`). */
    constructor(private readonly resource: string) {}

    async list(query?: TQuery): Promise<Page<TEntity>> {
        // `toString()`, NIE `params.size`: das gibt es erst ab Safari 17, und Vite transpiliert keine
        // Runtime-APIs. Auf iOS 16 wäre es `undefined` → Query-String fällt weg → Filter und
        // Sortierung werden still ignoriert, und die falschen Daten sehen richtig aus.
        const params = toSearchParams(query).toString();
        return apiGet<Page<TEntity>>(`/${this.resource}${params ? `?${params}` : ''}`);
    }

    async get(id: string): Promise<TEntity | null> {
        return apiGetOrNull<TEntity>(`/${this.resource}/${encodeURIComponent(id)}`);
    }

    async create(input: TCreate): Promise<TEntity> {
        return apiSend<TEntity>('POST', `/${this.resource}`, input);
    }

    async update(id: string, patch: Partial<TCreate>): Promise<TEntity> {
        return apiSend<TEntity>('PATCH', `/${this.resource}/${encodeURIComponent(id)}`, patch);
    }

    async remove(id: string): Promise<void> {
        await apiDelete(`/${this.resource}/${encodeURIComponent(id)}`);
    }
}
