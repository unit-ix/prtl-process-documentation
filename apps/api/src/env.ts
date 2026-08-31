// Env-Vertrag der API — eine fehlende Variable knallt beim Start, nicht beim ersten Request.
//
// Zwei Quellen: explizite Umgebungsvariablen gewinnen, `.unitix/project.json` liefert die Defaults.
// Lokal deckt die Datei alles ausser PGUSER; in Azure wird sie nicht mitgeliefert, dort sind die
// gleichnamigen App Settings Pflicht (docs/azure-runbook.md, Schritt 3b).
//
// Die Defaults kommen fest aus `environments.dev` — es gibt keine Variable, die das umschaltet, weil
// die App lokal gegen die Produktions-Datenbank laufen zu lassen kein Anwendungsfall ist. Wer es
// doch einmal braucht, setzt PGHOST/PGDATABASE/PGUSER inline (docs/environments.md).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Kein Passwort: die Anmeldung läuft über Entra (siehe db/client.ts).
const dbSchema = z.object({
    PGHOST: z.string().min(1),
    PGPORT: z.coerce.number().int().positive().default(5432),
    /** Feste Konvention, siehe docs/azure-runbook.md, Schritt 2. */
    PGDATABASE: z.string().min(1).default('app'),
    /** Lokal dein UPN (Root-`.env`), in Azure der Name der Managed Identity. */
    PGUSER: z.string().min(1),
});

const serverSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),

    /** Bestimmt JWKS und erwarteten `iss`. */
    ENTRA_TENANT_ID: z.string().min(1),
    /** Erwarteter `aud`: die nackte Client-id der API-App-Registrierung, nicht die `api://…`-URI. */
    ENTRA_API_AUDIENCE: z.string().min(1),

    // Optional: leer = workforce Entra ID. Gesetzt = Entra External ID (CIAM) — `iss` und
    // `jwks_uri` werden daraus automatisch gebildet, siehe issuer()/jwksUri() in auth/verify.ts.
    /** External ID: die `ciamlogin.com`-Subdomain des externen Mandanten, z. B. `contoso`. */
    ENTRA_SUBDOMAIN: z.string().optional(),

    /** Nur die SWA-Origin, kein Wildcard. Leer = keine Cross-Origin-Requests. */
    ALLOWED_ORIGIN: z.string().default(''),

    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(65536),
});

// Derselbe Pfad aus src/ (tsx) wie aus dist/ (node).
const PROJECT_JSON = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.unitix/project.json');

const LOCAL_ENVIRONMENT = 'dev';

interface ProjectJson {
    entra?: Record<string, string>;
    environments?: Record<string, { pg?: Record<string, string> }>;
}

/** Fehlende Datei = Normalfall in Azure. Vorhandene, aber kaputte Datei muss laut scheitern. */
function projectConfigDefaults(): Record<string, string> {
    let raw: string;
    try {
        raw = readFileSync(PROJECT_JSON, 'utf8');
    } catch {
        return {};
    }

    let config: ProjectJson;
    try {
        config = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `${PROJECT_JSON} ist kein gültiges JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    const { entra = {}, environments = {} } = config;
    const environment = environments[LOCAL_ENVIRONMENT];
    if (!environment) {
        const known = Object.keys(environments);
        throw new Error(
            `${PROJECT_JSON} → environments.${LOCAL_ENVIRONMENT} fehlt.` +
                (known.length > 0
                    ? ` Vorhanden: ${known.join(', ')}.`
                    : ' Der environments-Block ist leer.') +
                ` Lokal läuft die API immer gegen "${LOCAL_ENVIRONMENT}" — docs/environments.md.`,
        );
    }

    const { pg = {} } = environment;
    return Object.fromEntries(
        Object.entries({
            PGHOST: pg.host,
            PGDATABASE: pg.database,
            PGUSER: pg.user,
            ENTRA_TENANT_ID: entra.tenantId,
            ENTRA_API_AUDIENCE: entra.apiAudience,
            ENTRA_SUBDOMAIN: entra.subdomain,
        }).filter(([, value]) => typeof value === 'string' && value !== ''),
    ) as Record<string, string>;
}

function parse<S extends z.ZodTypeAny>(schema: S, label: string): z.infer<S> {
    // process.env zuletzt: eine gesetzte Variable schlägt den Default aus project.json.
    const result = schema.safeParse({ ...projectConfigDefaults(), ...process.env });
    if (result.success) return result.data;
    const details = result.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(
        `Ungültige ${label}-Konfiguration:\n${details}\n` +
            `Lokal aus .unitix/project.json, in Azure aus den App Settings — docs/azure-runbook.md, Schritt 3b.`,
    );
}

export const dbEnv = parse(dbSchema, 'Datenbank');

/** Beim Serverstart und vor jeder Migration protokolliert — die Werte haben Defaults, das Ziel
 * steht also nicht mehr zwangsläufig im Befehl. */
export const dbTarget = (): string => `${dbEnv.PGUSER}@${dbEnv.PGHOST}/${dbEnv.PGDATABASE}`;

export type ServerEnv = z.infer<typeof serverSchema>;

// Lazy: db/migrate.ts importiert `dbEnv` aus dieser Datei, darf aber nicht an fehlenden
// Auth-Variablen sterben.
let cachedServerEnv: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
    if (!cachedServerEnv) cachedServerEnv = parse(serverSchema, 'Server');
    return cachedServerEnv;
}

export const allowedOrigins = (): string[] =>
    serverEnv()
        .ALLOWED_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean);
