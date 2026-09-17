import type { AreaRef } from '@app/domain';

export interface AreaListItem extends AreaRef {
    processOwner: { id: string; displayName: string } | null;
}

export interface UserListItem {
    id: string;
    displayName: string;
    mail: string | null;
    isAuthor: boolean;
    isProcessOwner: boolean;
    isQm: boolean;
    isAdministrator: boolean;
    area: { id: string } | null;
}

export interface MasterDataRepository {
    areas(): Promise<AreaListItem[]>;
    users(): Promise<UserListItem[]>;
}
