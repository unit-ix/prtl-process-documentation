import { accessToken } from './auth';

const BASE = '/api';

interface Problem {
    title?: string;
    detail?: string;
}

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function toError(response: Response): Promise<ApiError> {
    const problem = (await response.json().catch(() => null)) as Problem | null;
    return new ApiError(response.status, problem?.detail ?? problem?.title ?? `HTTP ${response.status}`);
}

async function request(path: string, init: RequestInit): Promise<Response> {
    const token = await accessToken();
    return fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            ...init.headers,
            authorization: `Bearer ${token}`,
            ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        },
    });
}

export async function apiGet<T>(path: string): Promise<T> {
    const response = await request(path, { method: 'GET' });
    if (!response.ok) throw await toError(response);
    return (await response.json()) as T;
}

export async function apiGetOrNull<T>(path: string): Promise<T | null> {
    const response = await request(path, { method: 'GET' });
    if (response.status === 404) return null;
    if (!response.ok) throw await toError(response);
    return (await response.json()) as T;
}

export async function apiSend<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
    const response = await request(path, { method, body: JSON.stringify(body) });
    if (!response.ok) throw await toError(response);
    return (await response.json()) as T;
}

export async function apiDelete(path: string): Promise<void> {
    const response = await request(path, { method: 'DELETE' });
    if (!response.ok) throw await toError(response);
}
