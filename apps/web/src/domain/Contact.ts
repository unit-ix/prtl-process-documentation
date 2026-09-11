// → unitix_tblContact / contacts

export type ContactRole = 'decision_maker' | 'influencer' | 'user' | 'other';

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    readonly fullName: string;
    email: string;
    phone: string;
    role: ContactRole;
    company: { id: string };
    isPrimary: boolean;
    createdOn: string;
}
