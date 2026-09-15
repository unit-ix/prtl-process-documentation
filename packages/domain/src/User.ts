// → tblUser / users

export interface User {
    id: string;
    entraObjectId: string;
    displayName: string;
    mail: string | null;
    isAuthor: boolean;
    isProcessOwner: boolean;
    isQm: boolean;
    isAdministrator: boolean;
    area: { id: string } | null;
    isActive: boolean;
}
