// EINZIGER Swap-Punkt des Data-Seams: waehlt die Adapter nach `target`.
// Kein anderer File in src/ importiert aus data/adapters/** — hier ist die Grenze.
// Fork = diese Datei um einen Zweig ergaenzen, sonst nichts.
import { target } from '@/shared/lib/projectConfig';
import type { CompanyRepository } from './ports/CompanyRepository';
import type { ContactRepository } from './ports/ContactRepository';
import { MockCompanyRepository } from '@/data/adapters/mock/MockCompanyRepository';
import { MockContactRepository } from '@/data/adapters/mock/MockContactRepository';

function unsupported(): never {
    throw new Error(
        `Data-Adapter fuer target "${target}" nicht implementiert — siehe Roadmap R4 (supabase) / R5 (dataverse).`,
    );
}

export const companyRepository: CompanyRepository =
    target === 'mock' ? new MockCompanyRepository() : unsupported();

export const contactRepository: ContactRepository =
    target === 'mock' ? new MockContactRepository() : unsupported();
