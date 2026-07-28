// Backend naming (unitix_tblCompany / companies) lives ONLY in the adapter, never here.

/** Always a string literal union, never a numeric code. */
export type Industry =
    | 'technology'
    | 'manufacturing'
    | 'retail'
    | 'services'
    | 'public_sector'
    | 'other';

export type CompanyStatus = 'prospect' | 'active' | 'inactive';

export interface Company {
    id: string;
    name: string;
    industry: Industry;
    status: CompanyStatus;
    employeeCount: number;
    city: string;
    website: string;
    /** ISO string, not a Date — survives the JSON boundary of the real backends. */
    createdOn: string;
}
