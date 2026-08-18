// Anmeldung per Entra-Token (Managed Identity in Azure, `az login` lokal) — kein DB-Passwort.
import { DefaultAzureCredential } from '@azure/identity';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbEnv } from '../env.js';
import * as schema from './schema.js';

const POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

// Als Funktion, nicht als String: `pg` ruft sie bei JEDEM Verbindungsaufbau auf, und das Token
// gilt nur 5–60 Minuten. Der Credential-Cache verhindert einen HTTP-Call pro Connection.
function entraToken(): () => Promise<string> {
    const credential = new DefaultAzureCredential();
    return async () => {
        const token = await credential.getToken(POSTGRES_SCOPE);
        if (!token) throw new Error('Kein Entra-Token für PostgreSQL erhalten — Managed Identity korrekt zugewiesen?');
        return token.token;
    };
}

/** `database` weicht nur in `grant-identity.ts` ab — Begründung steht dort. */
export function createPool(database: string = dbEnv.PGDATABASE): Pool {
    const instance = new Pool({
        host: dbEnv.PGHOST,
        port: dbEnv.PGPORT,
        database,
        user: dbEnv.PGUSER,
        password: entraToken(),
        // Azures Kette hängt an einer Root-CA, die Node kennt — deshalb KEIN rejectUnauthorized: false.
        ssl: { rejectUnauthorized: true },
        max: 5,
    });

    // NICHT entfernen: ohne 'error'-Listener wirft eine sterbende idle-Verbindung (Failover,
    // Wartungsfenster) eine uncaught exception und nimmt den Prozess mit.
    instance.on('error', (error: Error) => {
        console.error('PostgreSQL-Pool: idle client gestorben —', error.message);
    });

    return instance;
}

export const pool = createPool();

export const db = drizzle(pool, { schema });
