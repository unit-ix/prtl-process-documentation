import type { ProcessListItem, ProcessSortField, ProcessStatus, SpecificationType, TemplateType } from '@app/domain';
import type { ListQuery, Page } from './Query';

export interface ProcessFilter {
    search?: string;
    area?: string;
    specificationType?: SpecificationType;
    templateType?: TemplateType;
    status?: ProcessStatus;
}

export type ProcessListQuery = ListQuery<ProcessFilter, ProcessSortField>;

export interface ProcessRepository {
    list(query?: ProcessListQuery): Promise<Page<ProcessListItem>>;
}
