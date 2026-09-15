import type { ProcessListItem } from '@app/domain';
import type { ProcessListQuery, ProcessRepository } from '@/data/ports/ProcessRepository';
import type { Page } from '@/data/ports/Query';
import { apiGet } from './client';
import { toSearchParams, type AnyListQuery } from './query';

export class AzureProcessRepository implements ProcessRepository {
    list(query?: ProcessListQuery): Promise<Page<ProcessListItem>> {
        const params = toSearchParams(query as AnyListQuery | undefined).toString();
        return apiGet<Page<ProcessListItem>>(`/processes${params === '' ? '' : `?${params}`}`);
    }
}
