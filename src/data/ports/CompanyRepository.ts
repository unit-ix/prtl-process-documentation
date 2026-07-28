import type { Company } from '@/domain/Company';
import type { QueryOf, QuerySpec } from './Query';
import type { Repository } from './Repository';

export type CompanyCreate = Omit<Company, 'id' | 'createdOn'>;

export const companyQuerySpec = {
    searchField: 'name',
    equalityFields: ['status', 'industry'],
    sortFields: ['name', 'city', 'employeeCount', 'createdOn'],
} as const satisfies QuerySpec<Company>;

export type CompanyQuery = QueryOf<Company, typeof companyQuerySpec>;

export type CompanyRepository = Repository<Company, CompanyCreate, CompanyQuery>;
