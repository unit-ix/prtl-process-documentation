import type { AssistantHit } from '@app/domain';

export interface AssistantAnswer {
    answer: string;
    hits: AssistantHit[];
}

export interface AssistantRepository {
    ask(question: string): Promise<AssistantAnswer>;
}
