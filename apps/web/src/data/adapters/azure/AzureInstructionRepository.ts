import type { InstructionDetailView, InstructionListItem } from '@app/domain';
import type { InstructionInput, InstructionRepository } from '@/data/ports/InstructionRepository';
import { apiDelete, apiGet, apiSend } from './client';

export class AzureInstructionRepository implements InstructionRepository {
    async list(): Promise<InstructionListItem[]> {
        const { items } = await apiGet<{ items: InstructionListItem[] }>('/instructions');
        return items;
    }

    get(id: string): Promise<InstructionDetailView> {
        return apiGet<InstructionDetailView>(`/instructions/${id}`);
    }

    create(input: InstructionInput): Promise<{ id: string }> {
        return apiSend<{ id: string }>('POST', '/instructions', input);
    }

    async update(id: string, input: InstructionInput): Promise<void> {
        await apiSend<void>('PATCH', `/instructions/${id}`, input);
    }

    remove(id: string): Promise<void> {
        return apiDelete(`/instructions/${id}`);
    }

    notify(id: string): Promise<{ queued: number }> {
        return apiSend<{ queued: number }>('POST', `/instructions/${id}/notify`, {});
    }

    async notifyParticipant(id: string, participantId: string): Promise<void> {
        await apiSend<void>('POST', `/instructions/${id}/participants/${participantId}/notify`, {});
    }

    confirmAll(id: string): Promise<{ confirmed: number }> {
        return apiSend<{ confirmed: number }>('POST', `/instructions/${id}/confirm-all`, {});
    }

    async confirmParticipant(id: string, participantId: string): Promise<void> {
        await apiSend<void>('POST', `/instructions/${id}/participants/${participantId}/confirm`, {});
    }

    async acknowledge(id: string): Promise<void> {
        await apiSend<void>('POST', `/instructions/${id}/acknowledge`, {});
    }
}
