// The one swap point of the data seam: picks the adapters by `backend`.
import { backend } from '@/shared/lib/projectConfig';
import type { Company } from '@/domain/Company';
import type { Contact } from '@/domain/Contact';
import type { CompanyCreate, CompanyQuery, CompanyRepository } from './ports/CompanyRepository';
import type { ContactCreate, ContactQuery, ContactRepository } from './ports/ContactRepository';
import { MockCompanyRepository } from '@/data/adapters/mock/MockCompanyRepository';
import { MockContactRepository } from '@/data/adapters/mock/MockContactRepository';
import { AzureRepository } from '@/data/adapters/azure/AzureRepository';
import { ensureSignedIn } from '@/data/adapters/azure/auth';

function unsupported(): never {
    throw new Error(
        `Data-Adapter für Backend "${backend}" nicht implementiert — wird beim Fork ergänzt.`,
    );
}

/**
 * Einmaliger Bootstrap vor dem ersten Render, aufgerufen aus app/main.tsx. Verzweigt hier und nicht
 * in main.tsx, damit die Backend-Fallunterscheidung an genau einer Stelle steht.
 */
export async function initDataAccess(): Promise<void> {
    if (backend === 'azure') await ensureSignedIn();
}

export const companyRepository: CompanyRepository =
    backend === 'mock'
        ? new MockCompanyRepository()
        : backend === 'azure'
          ? new AzureRepository<Company, CompanyCreate, CompanyQuery>('companies')
          : unsupported();

export const contactRepository: ContactRepository =
    backend === 'mock'
        ? new MockContactRepository()
        : backend === 'azure'
          ? new AzureRepository<Contact, ContactCreate, ContactQuery>('contacts')
          : unsupported();
