// Backend naming (unitix_tblContact / contacts) lives ONLY in the adapter, never here.

/** Always a string literal union, never a numeric code. */
export type ContactRole = 'decision_maker' | 'influencer' | 'user' | 'other';

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    /** Computed by the backend. Never set directly. */
    readonly fullName: string;
    email: string;
    phone: string;
    role: ContactRole;
    /** Lookup: the id only, never an embedded object. */
    company: { id: string };
    isPrimary: boolean;
    /** ISO string, not a Date — survives the JSON boundary of the real backends. */
    createdOn: string;
}
