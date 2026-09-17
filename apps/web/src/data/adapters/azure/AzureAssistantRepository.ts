import type { AssistantAnswer, AssistantRepository } from '@/data/ports/AssistantRepository';
import { apiSend } from './client';

export class AzureAssistantRepository implements AssistantRepository {
    ask(question: string): Promise<AssistantAnswer> {
        return apiSend<AssistantAnswer>('POST', '/assistant/ask', { question });
    }
}
