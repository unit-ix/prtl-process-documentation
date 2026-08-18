// Fehlerkontrakt der API (RFC 7807) — das Frontend unterscheidet daran 404 von 401 von 500.

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly title: string,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export const badRequest = (detail: string) => new ApiError(400, 'bad_request', detail);
export const unauthorized = (detail: string) => new ApiError(401, 'unauthorized', detail);
export const notFound = (detail: string) => new ApiError(404, 'not_found', detail);

export interface Problem {
    type: string;
    title: string;
    status: number;
    detail: string;
}

/** Für 4xx, die nicht von uns kommen: Fastify legt seinen Status in `statusCode` ab. */
const TITLES: Readonly<Record<number, string>> = {
    400: 'bad_request',
    401: 'unauthorized',
    404: 'not_found',
    429: 'rate_limited',
};

function statusOf(error: unknown): number | null {
    const status = (error as { statusCode?: unknown } | null)?.statusCode;
    return typeof status === 'number' ? status : null;
}

export function toProblem(error: unknown): Problem {
    if (error instanceof ApiError) {
        return { type: 'about:blank', title: error.title, status: error.status, detail: error.message };
    }

    // Ohne diesen Zweig meldet die Drosselung „500 — unerwarteter Fehler" statt „429 — zu schnell",
    // und ein funktionierendes Limit sieht im Betrieb aus wie ein Ausfall.
    const status = statusOf(error);
    if (status !== null && status >= 400 && status < 500) {
        const detail = error instanceof Error ? error.message : 'Ungültige Anfrage.';
        return { type: 'about:blank', title: TITLES[status] ?? 'bad_request', status, detail };
    }

    // Unbekanntes wird ein nichtssagender 500er — die Ursache gehört ins Log, nicht in die Antwort.
    return { type: 'about:blank', title: 'internal_error', status: 500, detail: 'Unerwarteter Fehler.' };
}
