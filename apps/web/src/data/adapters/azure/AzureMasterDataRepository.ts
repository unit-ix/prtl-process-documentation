import type { NumberArea } from '@app/domain';
import type { AreaListItem, MasterDataRepository, UserListItem } from '@/data/ports/MasterDataRepository';
import { apiGet } from './client';

export class AzureMasterDataRepository implements MasterDataRepository {
    async areas(): Promise<AreaListItem[]> {
        const { items } = await apiGet<{ items: AreaListItem[] }>('/areas');
        return items;
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
