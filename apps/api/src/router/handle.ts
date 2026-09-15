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
import { parseBody } from './parseBody.js';
import { listUsers } from './users.js';
import { createProcess, createProcessSchema, deleteProcess } from '../workflow/create.js';
import { approveFormal } from '../workflow/release.js';
import { reopenForRevision, reopenSchema } from '../workflow/revision.js';
import { saveContent, saveContentSchema } from '../workflow/saveContent.js';
import { approveContent, assignAuthor, rejectContent, rejectFormal, submitForReview } from '../workflow/statusMoves.js';
import { z } from 'zod';

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

const assignAuthorSchema = z.object({ authorId: z.string().uuid() }).strict();
const commentSchema = z.object({ comment: z.string().trim().min(1).max(2000) }).strict();

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
    {
        method: 'POST',
        path: '/processes',
        handle: async ({ user, body }) => ({
            status: 201,
            body: await createProcess(user, parseBody(createProcessSchema, body)),
        }),
    },
    {
        method: 'PATCH',
        path: '/processes/:id',
        handle: ({ user, params, body }) => ok(saveContent(user, params.id, parseBody(saveContentSchema, body))),
    },
    {
        method: 'DELETE',
        path: '/processes/:id',
        handle: async ({ user, params }) => {
            await deleteProcess(user, params.id);
            return { status: 204, body: null };
        },
    },
    {
        method: 'POST',
        path: '/processes/:id/assign-author',
        handle: ({ user, params, body }) =>
            ok(assignAuthor(user, params.id, parseBody(assignAuthorSchema, body).authorId)),
    },
    { method: 'POST', path: '/processes/:id/submit', handle: ({ user, params }) => ok(submitForReview(user, params.id)) },
    {
        method: 'POST',
        path: '/processes/:id/approve-content',
        handle: ({ user, params }) => ok(approveContent(user, params.id)),
    },
    {
        method: 'POST',
        path: '/processes/:id/reject-content',
        handle: ({ user, params, body }) =>
            ok(rejectContent(user, params.id, parseBody(commentSchema, body).comment)),
    },
    {
        method: 'POST',
        path: '/processes/:id/approve-formal',
        handle: ({ user, params }) => ok(approveFormal(user, params.id)),
    },
    {
        method: 'POST',
        path: '/processes/:id/reject-formal',
        handle: ({ user, params, body }) => ok(rejectFormal(user, params.id, parseBody(commentSchema, body).comment)),
    },
    {
        method: 'POST',
        path: '/processes/:id/reopen',
        handle: ({ user, params, body }) =>
            ok(reopenForRevision(user, params.id, parseBody(reopenSchema, body).changeReason ?? null)),
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
