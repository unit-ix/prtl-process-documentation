import type { AssistantHit } from '@app/domain';

export interface AssistantAnswer {
    answer: string;
    hits: AssistantHit[];
    /** false = das Modell war nicht erreichbar, die Antwort ist die reine Trefferliste. */
    generated: boolean;
}

export interface AssistantRepository {
    ask(question: string): Promise<AssistantAnswer>;
}
