// Anmeldung per Entra-Token, kein DB-Passwort. Der `error`-Listener ist Pflicht:
// .claude/docs/patterns-azure.md, „Code-Fallen".
import { DefaultAzureCredential } from '@azure/identity';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbEnv } from '../env.js';
import * as schema from './schema/index.js';

const POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

function entraToken(): () => Promise<string> {
    const credential = new DefaultAzureCredential();
    return async () => {
        const token = await credential.getToken(POSTGRES_SCOPE);
        if (!token) throw new Error('Kein Entra-Token für PostgreSQL erhalten — Managed Identity korrekt zugewiesen?');
        return token.token;
    };
}

export function createPool(database: string = dbEnv.PGDATABASE): Pool {
    const instance = new Pool({
        host: dbEnv.PGHOST,
        port: dbEnv.PGPORT,
        database,
        user: dbEnv.PGUSER,
        password: entraToken(),
        ssl: { rejectUnauthorized: true },
        max: 5,
    });

    instance.on('error', (error: Error) => {
        console.error('PostgreSQL-Pool: idle client gestorben —', error.message);
    });

    return instance;
}

export const pool = createPool();

export const db = drizzle(pool, { schema });
