// PROTOTYPE-ONLY — am Fork ersetzt durch den echten Backend-Adapter.
import { buildSeed, type SeedData } from './seed';

let seeded: SeedData | null = null;

export function db(): SeedData {
    seeded ??= buildSeed();
    return seeded;
}

let sequence = 0;
export function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-new-${sequence}`;
}
