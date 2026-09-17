import type { ProcessDetailView, ProcessListItem } from '@app/domain';
import type {
    CreateProcessInput,
    ProcessListQuery,
    ProcessRepository,
    SaveProcessInput,
    TransitionResult,
} from '@/data/ports/ProcessRepository';
import type { Page } from '@/data/ports/Query';
import { apiDelete, apiGet, apiSend } from './client';
import { toSearchParams, type AnyListQuery } from './query';

export class AzureProcessRepository implements ProcessRepository {
    list(query?: ProcessListQuery): Promise<Page<ProcessListItem>> {
        const params = toSearchParams(query as AnyListQuery | undefined).toString();
        return apiGet<Page<ProcessListItem>>(`/processes${params === '' ? '' : `?${params}`}`);
    }

    get(id: string): Promise<ProcessDetailView> {
        return apiGet<ProcessDetailView>(`/processes/${id}`);
    }

    create(input: CreateProcessInput): Promise<{ id: string }> {
        return apiSend<{ id: string }>('POST', '/processes', input);
    }

    save(id: string, input: SaveProcessInput): Promise<{ rowVersion: number }> {
        return apiSend<{ rowVersion: number }>('PATCH', `/processes/${id}`, input);
    }

    remove(id: string): Promise<void> {
        return apiDelete(`/processes/${id}`);
    }

    assignAuthor(id: string, authorId: string): Promise<TransitionResult> {
        return this.transition(id, 'assign-author', { authorId });
    }

    submit(id: string): Promise<TransitionResult> {
        return this.transition(id, 'submit');
    }

    approveContent(id: string): Promise<TransitionResult> {
        return this.transition(id, 'approve-content');
    }

    rejectContent(id: string, comment: string): Promise<TransitionResult> {
        return this.transition(id, 'reject-content', { comment });
    }

    approveFormal(id: string): Promise<TransitionResult & { identifier?: string; edition?: number }> {
        return this.transition(id, 'approve-formal');
    }

    rejectFormal(id: string, comment: string): Promise<TransitionResult> {
        return this.transition(id, 'reject-formal', { comment });
    }

    reopen(id: string, changeReason: string | null): Promise<TransitionResult> {
        return this.transition(id, 'reopen', { changeReason });
    }

    async snapshot(id: string, versionId: string): Promise<string> {
        const { html } = await apiGet<{ html: string }>(`/processes/${id}/versions/${versionId}/snapshot`);
        return html;
    }

    private transition<TResult extends TransitionResult>(
        id: string,
        name: string,
        body: unknown = {},
    ): Promise<TResult> {
        return apiSend<TResult>('POST', `/processes/${id}/${name}`, body);
    }
}
