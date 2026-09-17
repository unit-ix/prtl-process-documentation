import type { SessionUser } from '@app/domain';

export interface Session {
    /** null, wenn der angemeldete Nutzer keine Zeile in `users` hat — §2.1. */
    readonly user: SessionUser | null;
    readonly hasAccess: boolean;
}

export interface SessionRepository {
    me(): Promise<Session>;
}
