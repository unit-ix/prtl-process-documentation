// EINZIGER Swap-Punkt des Data-Seams: waehlt die Adapter nach `backend`.
// Kein anderer File in src/ importiert aus data/adapters/** — hier ist die Grenze.
// Fork = diese Datei um einen Zweig ergaenzen, sonst nichts.
import { backend } from '@/shared/lib/projectConfig';
import type { CompanyRepository } from './ports/CompanyRepository';
import type { ContactRepository } from './ports/ContactRepository';
import { MockCompanyRepository } from '@/data/adapters/mock/MockCompanyRepository';
import { MockContactRepository } from '@/data/adapters/mock/MockContactRepository';

function unsupported(): never {
    throw new Error(
        `Data-Adapter für Backend "${backend}" nicht implementiert — wird beim Fork ergänzt.`,
    );
}

export const companyRepository: CompanyRepository = backend === 'mock' ? new MockCompanyRepository() : unsupported();

export const contactRepository: ContactRepository = backend === 'mock' ? new MockContactRepository() : unsupported();
