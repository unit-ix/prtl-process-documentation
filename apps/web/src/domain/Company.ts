// → unitix_tblCompany / companies

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
    createdOn: string;
}
