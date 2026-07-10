// Backend-agnostisches Repository-Interface — der stabile Vertrag des Data-Seams.
// UI, Hooks und TanStack Query haengen NUR hieran, nie an einem konkreten Adapter.
// Migration mock → supabase|dataverse = einen Adapter pro Entitaet schreiben, kein Rewrite.
export interface Repository<TEntity, TCreate, TUpdate = Partial<TCreate>> {
    list(): Promise<TEntity[]>;
    get(id: string): Promise<TEntity | null>;
    create(input: TCreate): Promise<TEntity>;
    update(id: string, patch: TUpdate): Promise<TEntity>;
    remove(id: string): Promise<void>;
}
