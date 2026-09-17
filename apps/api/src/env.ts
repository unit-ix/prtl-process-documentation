import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const dbSchema = z.object({
    PGHOST: z.string().min(1),
    PGPORT: z.coerce.number().int().positive().default(5432),
    PGDATABASE: z.string().min(1).default('app'),
    PGUSER: z.string().min(1),
});

const serverSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),

    ENTRA_TENANT_ID: z.string().min(1),
    ENTRA_API_AUDIENCE: z.string().min(1),

    ENTRA_SUBDOMAIN: z.string().optional(),

    // Objekt-Id der Sicherheitsgruppe, aus der Benutzer übernommen werden dürfen (§9.7).
    ENTRA_USER_GROUP_ID: z.string().min(1).optional(),

    ALLOWED_ORIGIN: z.string().default(''),

    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(65536),
});

const foundrySchema = z.object({
    FOUNDRY_ENDPOINT: z.string().url(),
    FOUNDRY_DEPLOYMENT: z.string().min(1),
});

// `transport` schaltet den Versandweg um: 'graph' sobald Mail.Send vergeben ist,
// 'powerAutomate' als Übergang, 'none' solange keiner von beiden bereitsteht — dann bleiben die
// Zeilen in der Warteschlange stehen, statt als gesendet markiert zu werden.
const mailSchema = z.object({
    MAIL_SENDER_UPN: z.string().min(1),
    APP_URL: z.string().url(),
});

// Getrennt vom Rest: den Versandweg darf man erfragen, ohne dass Absender und App-URL schon
// gesetzt sein müssen. Sonst stürbe die ganze API beim Start, nur weil der Mailversand noch nicht
// eingerichtet ist — ein optionales Teilsystem darf das Ganze nicht mitnehmen.
// Die EINZIGEN beiden Geheimnisse im ganzen Stack — und beide gehören zum Übergangsweg über
// Power Automate, nicht zum Zielzustand. Sie stehen deshalb NICHT in project.json (das ist
// committet), sondern ausschliesslich in den App Settings bzw. lokal in der Root-.env. Die
// Trigger-URL trägt ihre Signatur im Query-String, ist also selbst ein Geheimnis; der Header
// kommt dazu, damit eine geleakte URL allein nicht reicht, um PRETTL-Mails zu verschicken.
const mailFlowSchema = z.object({
    MAIL_FLOW_URL: z.string().url(),
    MAIL_FLOW_SECRET: z.string().min(16),
});

const mailTransportSchema = z.object({
    MAIL_TRANSPORT: z.enum(['none', 'graph', 'powerAutomate']).default('none'),
});

const storageSchema = z.object({
    STORAGE_ACCOUNT: z.string().min(1),
    STORAGE_CONTAINER: z.string().min(1),
});

const PROJECT_JSON = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.unitix/project.json');

const LOCAL_ENVIRONMENT = 'dev';

interface ProjectJson {
    entra?: Record<string, string>;
    foundry?: Record<string, string>;
    mail?: Record<string, string>;
    environments?: Record<string, { url?: string; pg?: Record<string, string>; storage?: Record<string, string> }>;
}

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

    const { entra = {}, foundry = {}, mail = {}, environments = {} } = config;
    const environment = environments[LOCAL_ENVIRONMENT];
    if (!environment) {
        const known = Object.keys(environments);
        throw new Error(
            `${PROJECT_JSON} → environments.${LOCAL_ENVIRONMENT} fehlt.` +
                (known.length > 0 ? ` Vorhanden: ${known.join(', ')}.` : ' Der environments-Block ist leer.') +
                ` Lokal läuft die API immer gegen "${LOCAL_ENVIRONMENT}" — .claude/docs/patterns-azure.md.`,
        );
    }

    const { pg = {}, storage = {} } = environment;
    return Object.fromEntries(
        Object.entries({
            PGHOST: pg.host,
            PGDATABASE: pg.database,
            PGUSER: pg.user,
            STORAGE_ACCOUNT: storage.account,
            STORAGE_CONTAINER: storage.container,
            ENTRA_TENANT_ID: entra.tenantId,
            ENTRA_API_AUDIENCE: entra.apiAudience,
            ENTRA_SUBDOMAIN: entra.subdomain,
            ENTRA_USER_GROUP_ID: entra.userGroupId,
            FOUNDRY_ENDPOINT: foundry.endpoint,
            FOUNDRY_DEPLOYMENT: foundry.deployment,
            MAIL_SENDER_UPN: mail.senderUpn,
            MAIL_TRANSPORT: mail.transport,
            APP_URL: environment.url,
        }).filter(([, value]) => typeof value === 'string' && value !== ''),
    ) as Record<string, string>;
}

function setEnvVars(): Record<string, string> {
    return Object.fromEntries(
        Object.entries(process.env).filter(([, value]) => typeof value === 'string' && value !== ''),
    ) as Record<string, string>;
}

function parse<S extends z.ZodTypeAny>(schema: S, label: string): z.infer<S> {
    const result = schema.safeParse({ ...projectConfigDefaults(), ...setEnvVars() });
    if (result.success) return result.data;
    const details = result.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(
        `Ungültige ${label}-Konfiguration:\n${details}\n` +
            `Lokal aus .unitix/project.json, in Azure aus den App Settings — docs/azure-runbook.md, Schritt 3b.`,
    );
}

export const dbEnv = parse(dbSchema, 'Datenbank');

export const dbTarget = (): string => `${dbEnv.PGUSER}@${dbEnv.PGHOST}/${dbEnv.PGDATABASE}`;

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
    if (!cachedServerEnv) cachedServerEnv = parse(serverSchema, 'Server');
    return cachedServerEnv;
}

export type StorageEnv = z.infer<typeof storageSchema>;

let cachedStorageEnv: StorageEnv | null = null;

export function storageEnv(): StorageEnv {
    if (!cachedStorageEnv) cachedStorageEnv = parse(storageSchema, 'Speicher');
    return cachedStorageEnv;
}

export type FoundryEnv = z.infer<typeof foundrySchema>;

let cachedFoundryEnv: FoundryEnv | null = null;

export function foundryEnv(): FoundryEnv {
    if (!cachedFoundryEnv) cachedFoundryEnv = parse(foundrySchema, 'KI-Assistent');
    return cachedFoundryEnv;
}

export type MailEnv = z.infer<typeof mailSchema>;

let cachedMailEnv: MailEnv | null = null;

/** Vollständige Mail-Konfiguration — wird erst gelesen, wenn wirklich verschickt werden soll. */
export function mailEnv(): MailEnv {
    if (!cachedMailEnv) cachedMailEnv = parse(mailSchema, 'E-Mail');
    return cachedMailEnv;
}

export type MailTransportName = z.infer<typeof mailTransportSchema>['MAIL_TRANSPORT'];

export type MailFlowEnv = z.infer<typeof mailFlowSchema>;

let cachedMailFlowEnv: MailFlowEnv | null = null;

export function mailFlowEnv(): MailFlowEnv {
    if (!cachedMailFlowEnv) cachedMailFlowEnv = parse(mailFlowSchema, 'Power-Automate-Flow');
    return cachedMailFlowEnv;
}

export const mailTransportName = (): MailTransportName => parse(mailTransportSchema, 'E-Mail-Versandweg').MAIL_TRANSPORT;

export const allowedOrigins = (): string[] =>
    serverEnv()
        .ALLOWED_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean);
