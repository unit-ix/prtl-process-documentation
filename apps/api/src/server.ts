// Transport und Absicherung, Fachwirkung in router/handle.ts. Warum CORS vor der Auth und das
// Rate Limit danach: .claude/docs/patterns-azure.md, „Code-Fallen".
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { LogController, type FastifyReply, type FastifyRequest } from 'fastify';
import { bearerToken, verifyAccessToken, type Claims } from './auth/verify.js';
import { allowedOrigins, dbTarget, serverEnv } from './env.js';
import { clientIp } from './http/clientIp.js';
import { badRequest, toProblem, unauthorized, unsupportedMediaType } from './http/errors.js';
import { renderConfirmPage, renderConfirmResult } from './router/confirmPageHtml.js';
import { startMailSweep } from './mail/sweep.js';
import { handle } from './router/handle.js';
import { confirmPage, submitConfirmation } from './router/publicConfirm.js';

declare module 'fastify' {
    interface FastifyRequest {
        claims?: Claims;
    }
}

const env = serverEnv();

const app = Fastify({
    bodyLimit: env.BODY_LIMIT_BYTES,
    logger: { level: 'info' },
    logController: new LogController({ disableRequestLogging: true }),
});

app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    if (body === '') return done(null, undefined);
    try {
        done(null, JSON.parse(body as string));
    } catch {
        done(badRequest('Body ist kein gültiges JSON.'));
    }
});

app.addContentTypeParser('*', { parseAs: 'buffer' }, (request, body, done) => {
    if ((body as Buffer).length === 0) return done(null, undefined);
    done(unsupportedMediaType(`content-type "${request.headers['content-type']}" wird nicht unterstützt.`));
});

// Die gefährlichste Liste im Repo: was hier steht, ist ohne jede Anmeldung aus dem Internet
// erreichbar. /api/confirm/* ist die Bestätigung aus der Unterweisungs-Mail (§7.3) — sie
// authentifiziert über ein einmal verwendbares, gehashtes Token statt über Entra, weil der
// Empfänger oft gar kein M365-Konto hat.
const isPublic = (url: string): boolean =>
    url === '/health' || url.startsWith('/health?') || url.startsWith('/api/confirm/');

await app.register(cors, { origin: allowedOrigins(), credentials: false });

await app.register(rateLimit, { global: false, timeWindow: '1 minute' });

app.addHook('onRequest', async (request: FastifyRequest) => {
    if (isPublic(request.url)) return;
    request.claims = await verifyAccessToken(bearerToken(request.headers.authorization));
});

app.addHook(
    'preHandler',
    app.rateLimit({
        max: env.RATE_LIMIT_MAX,
        keyGenerator: (request: FastifyRequest) => request.claims?.objectId ?? clientIp(request),
        allowList: (request: FastifyRequest) => request.url === '/health' || request.url.startsWith('/health?'),
    }),
);

app.setErrorHandler((error, _request, reply) => {
    const problem = toProblem(error);
    if (problem.status >= 500) app.log.error(error);
    return reply.status(problem.status).type('application/problem+json').send(problem);
});

app.get('/health', async () => ({ status: 'ok' }));

app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => done(null, Object.fromEntries(new URLSearchParams(body as string))),
);

// Zweistufig: GET zeigt nur, POST schreibt. Begründung in router/publicConfirm.ts.
app.get('/api/confirm/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as { token: string };
    const html = renderConfirmPage(token, await confirmPage(token));
    return reply.type('text/html; charset=utf-8').header('cache-control', 'no-store').send(html);
});

app.post('/api/confirm/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as { token: string };
    const answer = (request.body as { answer?: string } | undefined)?.answer === 'no' ? 'no' : 'yes';
    const result = await submitConfirmation(token, answer, {
        ip: clientIp(request),
        userAgent: request.headers['user-agent'] ?? null,
    });

    return reply
        .type('text/html; charset=utf-8')
        .header('cache-control', 'no-store')
        .send(renderConfirmResult(result.ok ? answer : null));
});

app.all('/api/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const { claims } = request;
    if (!claims) throw unauthorized('Kein geprüftes Token am Request.');

    const { status, body } = await handle({
        claims,
        method: request.method,
        path: `/${(request.params as { '*': string })['*']}`,
        query: request.query as Record<string, string | undefined>,
        body: request.body,
    });

    return status === 204 ? reply.status(204).send() : reply.status(status).send(body);
});

app.log.info(`Datenbank-Ziel: ${dbTarget()}`);

startMailSweep();

await app.listen({ port: env.PORT, host: '0.0.0.0' });
