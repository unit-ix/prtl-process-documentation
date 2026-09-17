import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db, pool } from './client.js';
import { dbTarget } from '../env.js';

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

async function main(): Promise<void> {
    console.log(`→ Ziel: ${dbTarget()}`);
    console.log(`→ Migrationen aus ${migrationsFolder} …`);
    await migrate(db, { migrationsFolder });
    console.log('✓ Migrationen aktuell.');
}

main()
    .catch((error: unknown) => {
        console.error('\n✖ Migration fehlgeschlagen:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
