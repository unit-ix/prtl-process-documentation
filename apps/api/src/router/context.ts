import type { SessionUser } from '@app/domain';
import type { Claims } from '../auth/verify.js';
import type { PathParams } from './match.js';

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
