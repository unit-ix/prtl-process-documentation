// Domain-Typ — sauberer Persistenz-Vertrag (src/domain schlaegt DoD-feature-lokale types/).
// → unitix_tblCompany   Backend-Naming (unitix_*, snake_case) lebt NUR im Adapter,
//                       nie hier. Diese Datei ist der one-entity-one-table-Vertrag,
//                       discoverable fuer Jakobs Schema-derive-CLI (Roadmap R5).

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
