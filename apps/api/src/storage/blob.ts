// Vorlage — Endung .example entfernen zum Aktivieren. Konzept, Invarianten und Checkliste:
// .claude/docs/patterns-azure.md, „Blob Storage". Braucht `pnpm --filter @app/api add @azure/storage-blob`.
import { DefaultAzureCredential } from '@azure/identity';
import {
    BlobSASPermissions,
    BlobServiceClient,
    generateBlobSASQueryParameters,
    SASProtocol,
    type ContainerClient,
    type UserDelegationKey,
} from '@azure/storage-blob';
import { storageEnv } from '../env.js';

let cachedService: BlobServiceClient | null = null;

function blobService(): BlobServiceClient {
    if (!cachedService) {
        const { STORAGE_ACCOUNT } = storageEnv();
        cachedService = new BlobServiceClient(
            `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
            new DefaultAzureCredential(),
        );
    }
    return cachedService;
}

const container = (): ContainerClient => blobService().getContainerClient(storageEnv().STORAGE_CONTAINER);

/** Beide Hälften gehören dem Server: das Präfix aus dem geprüften Token, die uuid aus Schritt 1. */
export const blobName = (objectId: string, fileId: string): string => `${objectId}/${fileId}`;

/** Uhrendrift: ein startsOn in der Zukunft macht den SAS sofort unbrauchbar. */
const CLOCK_SKEW_MS = 5 * 60_000;

const KEY_LIFETIME_MS = 60 * 60_000;

// Der SAS muss INNERHALB der Key-Lebensdauer ablaufen, sonst antwortet der Dienst 403. Der Abstand
// ist die längste SAS-Laufzeit plus Drift: 60 − 15 − 5. Rechnung: .claude/docs/patterns-azure.md.
const KEY_RENEW_BEFORE_MS = 20 * 60_000;

let cachedKey: { key: UserDelegationKey; expiresOn: number } | null = null;

async function delegationKey(): Promise<UserDelegationKey> {
    const now = Date.now();
    if (cachedKey && cachedKey.expiresOn - now > KEY_RENEW_BEFORE_MS) return cachedKey.key;

    const expiresOn = now + KEY_LIFETIME_MS;
    const key = await blobService().getUserDelegationKey(new Date(now - CLOCK_SKEW_MS), new Date(expiresOn));
    if (!key.value) throw new Error('User-Delegation-Key ohne Schlüsselwert — Rolle "Storage Blob Delegator" gesetzt?');
    cachedKey = { key, expiresOn };
    return key;
}

// Der Name wird ein Response-Header: CR/LF und " brechen Content-Disposition auf.
const headerSafe = (fileName: string): string =>
    // eslint-disable-next-line no-control-regex
    fileName.replace(/[\u0000-\u001f\u007f"\\]/g, '_').slice(0, 200) || 'download';

interface SasOptions {
    readonly blobName: string;
    readonly permissions: 'r' | 'c';
    readonly minutes: number;
    /** Nur beim Lesen: erzwingt `attachment` aus den serverseitig geprüften Werten der Zeile. */
    readonly fileName?: string;
    readonly contentType?: string;
}

async function sasUrl(options: SasOptions): Promise<{ url: string; expiresOn: Date }> {
    const { STORAGE_ACCOUNT, STORAGE_CONTAINER } = storageEnv();
    // Kein startsOn: Uhrendrift ließe frisch ausgegebene SAS sonst sporadisch scheitern.
    const expiresOn = new Date(Date.now() + options.minutes * 60_000);

    const query = generateBlobSASQueryParameters(
        {
            containerName: STORAGE_CONTAINER,
            blobName: options.blobName,
            permissions: BlobSASPermissions.parse(options.permissions),
            expiresOn,
            protocol: SASProtocol.Https,
            ...(options.fileName
                ? {
                      contentDisposition: `attachment; filename="${headerSafe(options.fileName)}"`,
                      contentType: options.contentType,
                  }
                : {}),
        },
        await delegationKey(),
        STORAGE_ACCOUNT,
    );

    const encodedName = options.blobName.split('/').map(encodeURIComponent).join('/');
    return {
        url: `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${encodedName}?${query}`,
        expiresOn,
    };
}

export const uploadSas = (name: string) => sasUrl({ blobName: name, permissions: 'c', minutes: 15 });

export const readSas = (name: string, fileName: string, contentType: string) =>
    sasUrl({ blobName: name, permissions: 'r', minutes: 10, fileName, contentType });

/** Echte Größe und Typ-Abgleich für Schritt 3 — der Blob selbst, nicht die Behauptung des Clients. */
export const properties = (name: string) => container().getBlockBlobClient(name).getProperties();

export const remove = async (name: string): Promise<void> => {
    await container().getBlockBlobClient(name).deleteIfExists();
};
