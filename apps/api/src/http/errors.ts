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
export const forbidden = (detail: string) => new ApiError(403, 'forbidden', detail);
export const notFound = (detail: string) => new ApiError(404, 'not_found', detail);
export const unsupportedMediaType = (detail: string) =>
    new ApiError(415, 'unsupported_media_type', detail);

export interface Problem {
    type: string;
    title: string;
    status: number;
    detail: string;
}

const TITLES: Readonly<Record<number, string>> = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    415: 'unsupported_media_type',
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

    const status = statusOf(error);
    if (status !== null && status >= 400 && status < 500) {
        const detail = error instanceof Error ? error.message : 'Ungültige Anfrage.';
        return { type: 'about:blank', title: TITLES[status] ?? 'bad_request', status, detail };
    }

    return { type: 'about:blank', title: 'internal_error', status: 500, detail: 'Unerwarteter Fehler.' };
}
