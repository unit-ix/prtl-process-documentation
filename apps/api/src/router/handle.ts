// Transport-agnostischer Router: `({ method, path, query, body }) → { status, body }`.
// Auth, Rate Limit, CORS und Fehlerkontrakt sitzen in server.ts.
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { badRequest, notFound } from '../http/errors.js';
import { listRows } from './list.js';
import { RESOURCES, toColumns, type Resource } from './registry.js';

export interface RouterRequest {
    readonly method: string;
    /** Pfad OHNE /api-Präfix, z. B. `/contacts` oder `/contacts/<uuid>`. */
    readonly path: string;
    readonly query: Record<string, string | undefined>;
    readonly body: unknown;
}

export interface RouterResponse {
    readonly status: number;
    readonly body: unknown;
}

interface Target {
    resource: Resource;
    id: string | null;
}

function resolveTarget(path: string): Target {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 2) throw notFound(`Unbekannter Pfad "${path}".`);
    const resource = RESOURCES[segments[0]];
    if (!resource) throw notFound(`Unbekannte Ressource "${segments[0]}".`);
    return { resource, id: segments[1] ?? null };
}

// `.strict()` in der Registry ist die Schreib-Whitelist: eine Spalte, die nicht im Schema steht,
// ist über die API nicht setzbar — auch wenn sie in der Tabelle existiert.
function parseBody(schema: Resource['createSchema'], body: unknown): Record<string, unknown> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        const detail = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
        throw badRequest(detail);
    }
    return toColumns(parsed.data as Record<string, unknown>);
}

async function getOne(resource: Resource, id: string): Promise<unknown> {
    const rows = await db.select().from(resource.table).where(eq(resource.idColumn, id)).limit(1);
    if (rows.length === 0) throw notFound(`Datensatz ${id} nicht gefunden.`);
    return resource.toDomain(rows[0] as never);
}

async function writeOne(resource: Resource, id: string | null, values: Record<string, unknown>): Promise<unknown> {
    // Ohne diesen Guard baut Drizzle ein `UPDATE … SET` ohne Zuweisung → SQL-Fehler → 500 statt 400.
    if (id && Object.keys(values).length === 0) throw badRequest('PATCH ohne Felder.');

    const rows = id
        ? await db.update(resource.table).set(values).where(eq(resource.idColumn, id)).returning()
        : await db.insert(resource.table).values(values as never).returning();
    if (rows.length === 0) throw notFound(`Datensatz ${id} nicht gefunden.`);
    return resource.toDomain(rows[0] as never);
}

async function onCollection(method: string, resource: Resource, req: RouterRequest): Promise<RouterResponse> {
    if (method === 'GET') return { status: 200, body: await listRows(resource, req.query) };
    if (method === 'POST') {
        return { status: 201, body: await writeOne(resource, null, parseBody(resource.createSchema, req.body)) };
    }
    throw notFound(`${method} auf einer Sammlung ist nicht vorgesehen.`);
}

async function onItem(method: string, resource: Resource, id: string, req: RouterRequest): Promise<RouterResponse> {
    if (method === 'GET') return { status: 200, body: await getOne(resource, id) };
    if (method === 'PATCH') {
        return { status: 200, body: await writeOne(resource, id, parseBody(resource.updateSchema, req.body)) };
    }
    if (method === 'DELETE') {
        const rows = await db.delete(resource.table).where(eq(resource.idColumn, id)).returning();
        if (rows.length === 0) throw notFound(`Datensatz ${id} nicht gefunden.`);
        return { status: 204, body: null };
    }
    throw notFound(`${method} auf einem Datensatz ist nicht vorgesehen.`);
}

export async function handle(req: RouterRequest): Promise<RouterResponse> {
    const { resource, id } = resolveTarget(req.path);
    return id === null ? onCollection(req.method, resource, req) : onItem(req.method, resource, id, req);
}
