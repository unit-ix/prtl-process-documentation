// Fastify-Schale: Transport und Absicherung. Die Fachwirkung sitzt in router/handle.ts.
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { bearerToken, verifyAccessToken, type Claims } from './auth/verify.js';
import { allowedOrigins, dbTarget, serverEnv } from './env.js';
import { toProblem } from './http/errors.js';
import { handle } from './router/handle.js';

declare module 'fastify' {
    interface FastifyRequest {
        claims?: Claims;
    }
}

const env = serverEnv();

const app = Fastify({
    bodyLimit: env.BODY_LIMIT_BYTES,
    logger: { level: 'info' },
    disableRequestLogging: true,
});

/** `/health` muss ohne Identität erreichbar sein, sonst kann Azure die Instanz nicht prüfen. */
const isPublic = (url: string): boolean => url === '/health' || url.startsWith('/health?');

// MUSS vor der Auth registriert werden: @fastify/cors beantwortet OPTIONS-Preflights
// kurzschliessend, und ein Preflight trägt nie ein Token. Niemals `origin: true` — das erlaubte
// jeder fremden Seite Schreibzugriff mit dem Token des eingeloggten Nutzers.
await app.register(cors, { origin: allowedOrigins(), credentials: false });

await app.register(rateLimit, { global: false, timeWindow: '1 minute' });

app.addHook('onRequest', async (request: FastifyRequest) => {
    if (isPublic(request.url)) return;
    request.claims = await verifyAccessToken(bearerToken(request.headers.authorization));
});

// preHandler, damit der Schlüssel die geprüfte Nutzer-id sein kann: eine IP würde ein ganzes
// Kundennetz hinter einer NAT-Adresse gemeinsam drosseln.
app.addHook(
    'preHandler',
    app.rateLimit({
        max: env.RATE_LIMIT_MAX,
        keyGenerator: (request: FastifyRequest) => request.claims?.objectId ?? request.ip,
        allowList: (request: FastifyRequest) => isPublic(request.url),
    }),
);

app.setErrorHandler((error, _request, reply) => {
    const problem = toProblem(error);
    if (problem.status >= 500) app.log.error(error);
    return reply.status(problem.status).type('application/problem+json').send(problem);
});

app.get('/health', async () => ({ status: 'ok' }));

// Ein Handler für alle Tabellen. Neue Tabelle = ein Eintrag in router/registry.ts, keine Route.
app.all('/api/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, body } = await handle({
        method: request.method,
        path: `/${(request.params as { '*': string })['*']}`,
        query: request.query as Record<string, string | undefined>,
        body: request.body,
    });

    return status === 204 ? reply.status(204).send() : reply.status(status).send(body);
});

app.log.info(`Datenbank-Ziel: ${dbTarget()}`);

await app.listen({ port: env.PORT, host: '0.0.0.0' });
