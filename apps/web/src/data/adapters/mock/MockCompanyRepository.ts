// PROTOTYPE-ONLY — replaced at the fork by SupabaseCompanyRepository / DataverseCompanyRepository.
import type { Company } from '@/domain/Company';
import { companyQuerySpec, type CompanyCreate, type CompanyQuery, type CompanyRepository } from '../../ports/CompanyRepository';
import type { Page } from '../../ports/Query';
import { applyQuery } from './query';
import { db, nextId } from './store';

const clone = (company: Company): Company => ({ ...company });

export class MockCompanyRepository implements CompanyRepository {
    async list(query?: CompanyQuery): Promise<Page<Company>> {
        return applyQuery(db.companies, query, companyQuerySpec, clone);
    }

    async get(id: string): Promise<Company | null> {
        const found = db.companies.find((company) => company.id === id);
        return found ? clone(found) : null;
    }

    async create(input: CompanyCreate): Promise<Company> {
        const company: Company = { ...input, id: nextId('company'), createdOn: new Date().toISOString() };
        db.companies.push(company);
        return clone(company);
    }

    async update(id: string, patch: Partial<CompanyCreate>): Promise<Company> {
        const index = db.companies.findIndex((company) => company.id === id);
        if (index === -1) throw new Error(`Company ${id} not found`);
        const next: Company = { ...db.companies[index], ...patch };
        db.companies[index] = next;
        return clone(next);
    }

    async remove(id: string): Promise<void> {
        const index = db.companies.findIndex((company) => company.id === id);
        if (index === -1) throw new Error(`Company ${id} not found`);
        db.companies.splice(index, 1);
    }
}
