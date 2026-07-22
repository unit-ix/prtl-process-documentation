// PROTOTYPE-ONLY — deterministische Mock-Daten. Wird am supabase/dataverse-Fork ersetzt.
// Mock lebt am DATEN-Layer (Port-Implementierung), nicht am Netzwerk-Layer (MSW ist unter
// der Code-App-CSP tot). faker ist HIER erlaubt — nirgends sonst in src/.
import { fakerDE as faker } from '@faker-js/faker';
import type { Company, CompanyStatus, Industry } from '@/domain/Company';
import type { Contact, ContactRole } from '@/domain/Contact';

const SEED = 42;
// Fixe Referenz-Zeit → faker.date.* ist deterministisch ueber beliebig viele Laeufe.
const REF_DATE = new Date('2026-01-01T00:00:00.000Z');

const COMPANY_COUNT = 8;
const CONTACT_COUNT = 10;

const INDUSTRIES: readonly Industry[] = [
    'technology',
    'manufacturing',
    'retail',
    'services',
    'public_sector',
    'other',
];
const COMPANY_STATUSES: readonly CompanyStatus[] = ['prospect', 'active', 'inactive'];
const CONTACT_ROLES: readonly ContactRole[] = ['decision_maker', 'influencer', 'user', 'other'];

// Referenz-Integritaet: waehlt eine REALE id aus einem bereits erzeugten Pool.
function pickRef<T extends { id: string }>(pool: readonly T[]): string {
    return faker.helpers.arrayElement(pool).id;
}

export interface SeedData {
    companies: Company[];
    contacts: Contact[];
}

// Re-seedet faker bei jedem Aufruf → identisches Ergebnis (inkl. Dates) ueber alle Laeufe.
export function buildSeed(): SeedData {
    faker.seed(SEED);
    faker.setDefaultRefDate(REF_DATE);

    // Companies ZUERST, damit Contacts danach reale ids referenzieren koennen.
    const companies: Company[] = Array.from({ length: COMPANY_COUNT }, () => ({
        id: faker.string.uuid(),
        name: faker.company.name(),
        industry: faker.helpers.arrayElement(INDUSTRIES),
        status: faker.helpers.arrayElement(COMPANY_STATUSES),
        employeeCount: faker.number.int({ min: 3, max: 5000 }),
        city: faker.location.city(),
        website: faker.internet.url(),
        createdOn: faker.date.past({ years: 3 }).toISOString(),
    }));

    const contacts: Contact[] = Array.from({ length: CONTACT_COUNT }, () => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        return {
            id: faker.string.uuid(),
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            email: faker.internet.email({ firstName, lastName }),
            phone: faker.phone.number(),
            role: faker.helpers.arrayElement(CONTACT_ROLES),
            company: { id: pickRef(companies) },
            isPrimary: faker.datatype.boolean(),
            createdOn: faker.date.recent({ days: 90 }).toISOString(),
        };
    });

    return { companies, contacts };
}
