import type { NumberArea } from '@app/domain';
import type {
    AreaInput,
    AreaListItem,
    AreaUpdateInput,
    MasterDataRepository,
    UserListItem,
} from '@/data/ports/MasterDataRepository';
import { apiGet, apiSend } from './client';

export class AzureMasterDataRepository implements MasterDataRepository {
    async areas(options: { includeInactive?: boolean } = {}): Promise<AreaListItem[]> {
        const { items } = await apiGet<{ items: AreaListItem[] }>(
            options.includeInactive ? '/areas?includeInactive=true' : '/areas',
        );
        return items;
    }

    createArea(input: AreaInput): Promise<{ id: string }> {
        return apiSend<{ id: string }>('POST', '/areas', input);
    }

    async updateArea(id: string, input: AreaUpdateInput): Promise<void> {
        await apiSend<void>('PATCH', `/areas/${id}`, input);
    }

    async users(): Promise<UserListItem[]> {
        const { items } = await apiGet<{ items: UserListItem[] }>('/users');
        return items;
    }

    async numbers(): Promise<NumberArea[]> {
        const { items } = await apiGet<{ items: NumberArea[] }>('/numbers');
        return items;
    }
}
