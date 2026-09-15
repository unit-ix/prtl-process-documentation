// Transport-agnostisch: kein fastify hier. Die Schale trägt Token, Rate Limit und CORS, dieser
// Router die Wirkung. Anders als im Template gibt es KEINE generische Registry — jeder Schreibweg
// ist ein eigener Endpoint mit eigener Prüfung (§0.5 Regel 4: niemals ein generisches PATCH, das
// einen Status setzen kann).
import type { SessionUser } from '@app/domain';
import type { Claims } from '../auth/verify.js';
import { forbidden, notFound } from '../http/errors.js';
import { listAreas } from './areas.js';
import { matchPath, type PathParams } from './match.js';
import { me } from './me.js';
import { getProcessDetail, getSnapshot } from './processDetail.js';
import { listProcesses } from './processes.js';
import { listUsers } from './users.js';

export interface RouterRequest {
    readonly claims: Claims;
    readonly method: string;
    readonly path: string;
    readonly query: Record<string, string | undefined>;
    readonly body: unknown;
}

export interface RouterResponse {
    readonly status: number;
    readonly body: unknown;
}

export interface RequestContext {
    readonly user: SessionUser;
    readonly params: PathParams;
    readonly query: Record<string, string | undefined>;
    readonly body: unknown;
}

interface Route {
    readonly method: string;
    readonly path: string;
    readonly handle: (context: RequestContext) => Promise<RouterResponse>;
}

const ok = async (body: unknown): Promise<RouterResponse> => ({ status: 200, body: await body });

const ROUTES: readonly Route[] = [
    { method: 'GET', path: '/areas', handle: () => ok(listAreas()) },
    { method: 'GET', path: '/users', handle: () => ok(listUsers()) },
    { method: 'GET', path: '/processes', handle: ({ user, query }) => ok(listProcesses(user, query)) },
    { method: 'GET', path: '/processes/:id', handle: ({ user, params }) => ok(getProcessDetail(user, params.id)) },
    {
        method: 'GET',
        path: '/processes/:id/versions/:versionId/snapshot',
        handle: async ({ user, params }) => ({
            status: 200,
            body: { html: await getSnapshot(user, params.id, params.versionId) },
        }),
    },
];

export async function handle(req: RouterRequest): Promise<RouterResponse> {
    // /me ist der einzige Pfad, den ein Nutzer OHNE Zeile in `users` erreichen darf — genau das ist
    // seine Aufgabe: der SPA sagen, dass sie die Seite "Keine Berechtigungen" zeigen soll.
    const session = await me(req.claims);
    if (req.method === 'GET' && matchPath('/me', req.path)) return { status: 200, body: session };

    if (!session.user || !session.hasAccess) {
        throw forbidden('Für dieses Konto ist keine Rolle hinterlegt.');
    }

    for (const route of ROUTES) {
        const params = matchPath(route.path, req.path);
        if (params === null) continue;
        if (route.method !== req.method) continue;
        return route.handle({ user: session.user, params, query: req.query, body: req.body });
    }

    throw notFound(`Unbekannter Pfad "${req.method} ${req.path}".`);
}
