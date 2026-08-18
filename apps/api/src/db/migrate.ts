// Migrations-Runner, programmatisch statt `drizzle-kit migrate`: so läuft die Migration durch
// dieselbe Pool-Factory wie der Server und kann sich mit einem Entra-Token anmelden.
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db, pool } from './client.js';

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

async function main(): Promise<void> {
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
