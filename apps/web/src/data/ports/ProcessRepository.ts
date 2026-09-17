import type {
    ProcessDetailView,
    ProcessListItem,
    ProcessSortField,
    ProcessStatus,
    SpecificationType,
    TemplateType,
} from '@app/domain';
import type { ListQuery, Page } from './Query';

export interface ProcessFilter {
    search?: string;
    area?: string;
    specificationType?: SpecificationType;
    templateType?: TemplateType;
    status?: ProcessStatus;
}

export type ProcessListQuery = ListQuery<ProcessFilter, ProcessSortField>;

export interface CreateProcessInput {
    title: string;
    shortDescription?: string | null;
    areaId: string;
    specificationType: SpecificationType;
    templateType: TemplateType;
    scope?: string | null;
    parentProcessId?: string | null;
}

export interface SaveProcessInput extends Record<string, unknown> {
    rowVersion: number;
}

export interface TransitionResult {
    status: ProcessStatus;
    toast: string;
}

/** Jeder Statuswechsel ist ein eigener Aufruf — es gibt bewusst kein generisches Setzen von `status`. */
export interface ProcessRepository {
    list(query?: ProcessListQuery): Promise<Page<ProcessListItem>>;
    get(id: string): Promise<ProcessDetailView>;
    create(input: CreateProcessInput): Promise<{ id: string }>;
    save(id: string, input: SaveProcessInput): Promise<{ rowVersion: number }>;
    remove(id: string): Promise<void>;
    assignAuthor(id: string, authorId: string): Promise<TransitionResult>;
    submit(id: string): Promise<TransitionResult>;
    approveContent(id: string): Promise<TransitionResult>;
    rejectContent(id: string, comment: string): Promise<TransitionResult>;
    approveFormal(id: string): Promise<TransitionResult & { identifier?: string; edition?: number }>;
    rejectFormal(id: string, comment: string): Promise<TransitionResult>;
    reopen(id: string, changeReason: string | null): Promise<TransitionResult>;
    snapshot(id: string, versionId: string): Promise<string>;
}
