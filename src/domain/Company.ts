// Domain-Typ — sauberer Persistenz-Vertrag, eine Entitaet = eine kuenftige Tabelle.
// → unitix_tblCompany   Backend-Naming lebt NUR im Adapter, nie hier.

/** Branche (Choice → optIndustry). String-Literal-Union, nie ein numerischer Code. */
export type Industry =
    | 'technology'
    | 'manufacturing'
    | 'retail'
    | 'services'
    | 'public_sector'
    | 'other';

/** Status im Vertriebs-Lebenszyklus (Choice → optStatus). */
export type CompanyStatus = 'prospect' | 'active' | 'inactive';

export interface Company {
    id: string;
    name: string;
    industry: Industry;
    status: CompanyStatus;
    employeeCount: number;
    city: string;
    website: string;
    createdOn: string; // ISO-String (⇒ dte) — überlebt den JSON-Seam der echten Backends; kein Laufzeit-Objekt

}
