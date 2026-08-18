// Env-Vertrag der API — eine fehlende Variable knallt beim Start, nicht beim ersten Request.
import { z } from 'zod';

// Kein Passwort: die Anmeldung läuft über Entra (siehe db/client.ts).
const dbSchema = z.object({
    PGHOST: z.string().min(1),
    PGPORT: z.coerce.number().int().positive().default(5432),
    PGDATABASE: z.string().min(1),
    /** Lokal dein UPN, in Azure der Name der Managed Identity. */
    PGUSER: z.string().min(1),
});

const serverSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),

    /** Bestimmt JWKS und erwarteten `iss`. */
    ENTRA_TENANT_ID: z.string().min(1),
    /** Erwarteter `aud`: Client-id der API-App-Registrierung bzw. `api://<id>`. */
    ENTRA_API_AUDIENCE: z.string().min(1),

    /** Nur die SWA-Origin, kein Wildcard. Leer = keine Cross-Origin-Requests. */
    ALLOWED_ORIGIN: z.string().default(''),

    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(65536),
});

function parse<S extends z.ZodTypeAny>(schema: S, label: string): z.infer<S> {
    const result = schema.safeParse(process.env);
    if (result.success) return result.data;
    const details = result.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Ungültige ${label}-Konfiguration:\n${details}`);
}

export const dbEnv = parse(dbSchema, 'Datenbank');

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
