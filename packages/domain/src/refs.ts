export interface UserRef {
    id: string;
    displayName: string;
    mail: string | null;
}

export interface AreaRef {
    id: string;
    title: string;
    shortCode: string;
    categoryNumber: number;
}

export interface ProcessRef {
    id: string;
    title: string;
    identifier: string | null;
}
