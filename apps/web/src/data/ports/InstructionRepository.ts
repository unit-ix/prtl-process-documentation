import type { InstructionDetailView, InstructionListItem, InstructionType, Recurrence } from '@app/domain';

export interface InstructionInput {
    processId: string;
    instructionType: InstructionType;
    dueDate?: string | null;
    recurrence?: Recurrence;
    note?: string | null;
    participantIds: string[];
}

export interface InstructionRepository {
    list(): Promise<InstructionListItem[]>;
    get(id: string): Promise<InstructionDetailView>;
    create(input: InstructionInput): Promise<{ id: string }>;
    update(id: string, input: InstructionInput): Promise<void>;
    remove(id: string): Promise<void>;
    notify(id: string): Promise<{ queued: number }>;
    confirmAll(id: string): Promise<{ confirmed: number }>;
    confirmParticipant(id: string, participantId: string): Promise<void>;
    acknowledge(id: string): Promise<void>;
}
