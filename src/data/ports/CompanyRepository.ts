import type { Company } from '@/domain/Company';
import type { Repository } from './Repository';

// Beim Anlegen entfaellt Server-Verantwortetes: id + createdOn.
export type CompanyCreate = Omit<Company, 'id' | 'createdOn'>;

export type CompanyRepository = Repository<Company, CompanyCreate>;
