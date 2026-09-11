import type { Page } from './Query';

export interface Repository<TEntity, TCreate, TQuery, TUpdate = Partial<TCreate>> {
    list(query?: TQuery): Promise<Page<TEntity>>;
    get(id: string): Promise<TEntity | null>;
    create(input: TCreate): Promise<TEntity>;
    update(id: string, patch: TUpdate): Promise<TEntity>;
    remove(id: string): Promise<void>;
}
