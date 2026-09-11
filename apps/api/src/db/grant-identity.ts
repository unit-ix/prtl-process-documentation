import { createPool, pool } from './client.js';

const name = process.env.API_IDENTITY_NAME;
const objectId = process.env.API_IDENTITY_OBJECT_ID;

if (!name || !objectId) {
    throw new Error('API_IDENTITY_NAME und API_IDENTITY_OBJECT_ID müssen gesetzt sein.');
}

const role = `"${name.replace(/"/g, '""')}"`;

const grants = (database: string): string[] => [
    `GRANT CONNECT ON DATABASE "${database}" TO ${role}`,
    `GRANT USAGE ON SCHEMA public TO ${role}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
];

const MAINTENANCE_DATABASE = 'postgres';

async function ensureRole(): Promise<void> {
    const maintenance = createPool(MAINTENANCE_DATABASE);
    try {
        const existing = await maintenance.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [name]);
        if (existing.rowCount === 0) {
            await maintenance.query(`SELECT pgaadauth_create_principal_with_oid($1, $2, 'service', false, false)`, [
                name,
                objectId,
            ]);
            console.log(`→ Rolle ${name} angelegt.`);
        } else {
            console.log(`→ Rolle ${name} existiert bereits.`);
        }
    } finally {
        await maintenance.end();
    }
}

async function main(): Promise<void> {
    await ensureRole();

    const client = await pool.connect();
    try {
        const database = (await client.query('SELECT current_database() AS db')).rows[0].db as string;
        for (const statement of grants(database)) {
            await client.query(statement);
        }
        console.log(`✓ Rechte auf "${database}" für ${name} gesetzt.`);
    } finally {
        client.release();
    }
}

main()
    .catch((error: unknown) => {
        console.error('\n✖ Grant fehlgeschlagen:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
