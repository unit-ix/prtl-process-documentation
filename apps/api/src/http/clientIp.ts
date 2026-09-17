import type { FastifyRequest } from 'fastify';

/**
 * Hinter der Static Web App ist `request.ip` IMMER die Adresse des Proxys (169.254.x.x) — als
 * Nachweis wertlos und als Schlüssel fürs Rate Limit sogar schädlich: alle Anrufer teilten sich
 * dann einen Eimer. Der erste Eintrag in `x-forwarded-for` ist der Client.
 *
 * Der Wert ist fälschbar, weil der App Service öffentlich erreichbar ist (patterns-azure: der
 * Schutz ist die Token-Schicht, nicht das Netz). Für einen Nachweis ist eine fälschbare, aber
 * plausible Adresse trotzdem mehr wert als die immer gleiche Adresse des Proxys.
 */
export function clientIp(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    // Azure hängt an die weitergereichte Adresse den Quellport an: "1.2.3.4:56789".
    const withoutPort = first?.replace(/:\d+$/, '');
    return withoutPort !== undefined && withoutPort !== '' ? withoutPort : request.ip;
}
