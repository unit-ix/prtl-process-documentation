// PROTOTYPE-ONLY — EIN geteilter In-Memory-Store fuer alle Mock-Repositories.
// Ein gemeinsamer Store haelt Contacts & Companies referenz-integer (dieselben Company-ids).
import { buildSeed } from './seed';

export const db = buildSeed();

// Fortlaufende ids fuer zur Laufzeit angelegte Datensaetze — kollidieren nicht mit den Seed-uuids.
let sequence = 0;
export function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-new-${sequence}`;
}
