// Transport-agnostisch: kein fastify hier. Die Schale trägt Token, Rate Limit und CORS, dieser
// Router die Wirkung. Anders als im Template gibt es KEINE generische Registry — jeder Schreibweg
// ist ein eigener Endpoint mit eigener Prüfung (§0.5 Regel 4: niemals ein generisches PATCH, das
// einen Status setzen kann). Die Tabelle selbst steht in routes.ts.
import { forbidden, notFound } from '../http/errors.js';
import { matchPath } from './match.js';
import { me } from './me.js';
import { ROUTES } from './routes.js';
import type { RouterRequest, RouterResponse } from './context.js';

export type { RouterRequest, RouterResponse } from './context.js';

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
