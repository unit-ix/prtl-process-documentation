// PROTOTYPE-ONLY — am Fork ersetzt durch den echten Backend-Adapter.
import { buildSeed, type SeedData } from './seed';

// Lazy und NICHT `export const db = buildSeed()`: ein Aufruf auf Modul-Top-Level ist ein
// Seiteneffekt, den Rollup nicht als rein beweisen kann. Das Modul blieb deshalb selbst im
// azure-Bundle stehen — mitsamt dem kompletten faker-Baum (~250 kB), obwohl dort nie ein
// Mock-Adapter läuft. Als Funktion ist die Datei seiteneffektfrei und fällt beim Tree-Shaking
// zusammen mit den Mock-Repositories weg.
let seeded: SeedData | null = null;

/** Der Seed, beim ersten Zugriff erzeugt und danach stabil — Mutationen bleiben sichtbar. */
export function db(): SeedData {
    seeded ??= buildSeed();
    return seeded;
}

let sequence = 0;
export function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-new-${sequence}`;
}
