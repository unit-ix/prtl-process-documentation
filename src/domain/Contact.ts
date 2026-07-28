// Domain-Typ — sauberer Persistenz-Vertrag, eine Entitaet = eine kuenftige Tabelle.
// → unitix_tblContact   Backend-Naming lebt NUR im Adapter, nie hier.

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
