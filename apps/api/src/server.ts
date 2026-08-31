// Transport und Absicherung, Fachwirkung in router/handle.ts. Warum CORS vor der Auth und das
// Rate Limit danach: docs/azure-decisions.md, „Code-Fallen".
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

const isPublic = (url: string): boolean => url === '/health' || url.startsWith('/health?');

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
