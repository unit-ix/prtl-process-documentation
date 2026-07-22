// Domain-Typ — sauberer Persistenz-Vertrag (src/domain schlaegt DoD-feature-lokale types/).
// → unitix_tblContact   Backend-Naming (unitix_*, snake_case) lebt NUR im Adapter,
//                       nie hier. Diese Datei ist der one-entity-one-table-Vertrag,
//                       discoverable fuer Jakobs Schema-derive-CLI (Roadmap R5).

/** Rolle im Buying-Center (Choice → optRole). String-Literal-Union, nie ein numerischer Code. */
export type ContactRole = 'decision_maker' | 'influencer' | 'user' | 'other';

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    /** Berechnet aus firstName + lastName (→ fxStrFullName). Read-only: nie direkt setzen. */
    readonly fullName: string;
    email: string;
    phone: string;
    role: ContactRole;
    /** Lookup auf Company (→ refCompany). Nur die id, nie das eingebettete Objekt. */
    company: { id: string };
    isPrimary: boolean;
    createdOn: string; // ISO-String (⇒ dte) — überlebt den JSON-Seam der echten Backends; kein Laufzeit-Objekt

}
