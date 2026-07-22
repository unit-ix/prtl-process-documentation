// PROTOTYPE-ONLY — In-Memory-Implementierung des CompanyRepository-Ports.
// Am Fork ersetzt durch SupabaseCompanyRepository (R4) bzw. DataverseCompanyRepository (R5).
import type { Company } from '@/domain/Company';
import type { CompanyCreate, CompanyRepository } from '../../ports/CompanyRepository';
import { db, nextId } from './store';

// Flach kopieren, damit Aufrufer nicht versehentlich den Store mutieren.
const clone = (company: Company): Company => ({ ...company });

export class MockCompanyRepository implements CompanyRepository {
    async list(): Promise<Company[]> {
        return db.companies.map(clone);
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
