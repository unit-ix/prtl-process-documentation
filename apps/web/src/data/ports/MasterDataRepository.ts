import type { AreaRef, CategoryNumber, NumberArea } from '@app/domain';

export interface AreaListItem extends AreaRef {
    processOwner: { id: string; displayName: string } | null;
    isActive: boolean;
    /** Ein Dokument des Bereichs hat ein Kennzeichen — Kürzel und Kategorie sind dann gesperrt. */
    isNumbered: boolean;
}

export interface AreaInput {
    title: string;
    shortCode: string;
    categoryNumber: CategoryNumber;
}

export type AreaUpdateInput = Partial<AreaInput> & { processOwnerId?: string | null; isActive?: boolean };

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
    /** Ohne Option nur aktive Bereiche — die Einstellungen brauchen alle, um wieder einzuschalten. */
    areas(options?: { includeInactive?: boolean }): Promise<AreaListItem[]>;
    createArea(input: AreaInput): Promise<{ id: string }>;
    updateArea(id: string, input: AreaUpdateInput): Promise<void>;
    users(): Promise<UserListItem[]>;
    /** Nur Administration: je Bereich die VA mit ihren Unterdokumenten und Nummern. */
    numbers(): Promise<NumberArea[]>;
}
