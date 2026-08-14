// PROTOTYPE-ONLY — replaced by the real backend at the fork.
import { buildSeed } from './seed';

export const db = buildSeed();

let sequence = 0;
export function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-new-${sequence}`;
}
