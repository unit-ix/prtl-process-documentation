import type { Session, SessionRepository } from '@/data/ports/SessionRepository';
import { apiGet } from './client';

export class AzureSessionRepository implements SessionRepository {
    me(): Promise<Session> {
        return apiGet<Session>('/me');
    }
}
