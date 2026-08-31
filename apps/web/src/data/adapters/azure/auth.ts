// Entra ID über MSAL Browser. Ablauf, Begründungen und Fehlertabelle: docs/auth.md.
import { BrowserAuthError, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { entra } from '@/shared/lib/projectConfig';

const API_SCOPE_NAME = 'access_as_user';

const apiScope = (): string => `api://${entra.apiAudience}/${API_SCOPE_NAME}`;

function client(): PublicClientApplication {
    const missing = (['tenantId', 'clientId', 'apiAudience'] as const).filter((key) => !entra[key]);
    if (missing.length > 0) {
        throw new Error(`.unitix/project.json → entra: ${missing.join(', ')} fehlt (siehe docs/azure-runbook.md).`);
    }

    const authority = entra.subdomain
        ? `https://${entra.tenantId}.ciamlogin.com/${entra.tenantId}`
        : `https://login.microsoftonline.com/${entra.tenantId}`;

    return new PublicClientApplication({
        auth: {
            clientId: entra.clientId,
            authority,
            ...(entra.subdomain ? { knownAuthorities: [new URL(authority).hostname] } : {}),
            redirectUri: window.location.origin,
        },
    });
}

let msal: PublicClientApplication | null = null;

export async function ensureSignedIn(): Promise<void> {
    const instance = client();
    await instance.initialize();

    const redirectResult = await instance.handleRedirectPromise();
    const account = redirectResult?.account ?? instance.getAllAccounts()[0];

    if (!account) {
        await instance.loginRedirect({ scopes: [apiScope()] });
        return;
    }

    instance.setActiveAccount(account);
    msal = instance;
}

const SILENT_DEAD_ENDS = new Set([
    'timed_out',
    'block_iframe_reload',
    'iframe_closed_prematurely',
    'empty_window_error',
    'hash_empty_error',
    'no_state_in_hash',
    'hash_does_not_contain_known_properties',
]);

const needsInteraction = (error: unknown): boolean =>
    error instanceof InteractionRequiredAuthError ||
    (error instanceof BrowserAuthError && SILENT_DEAD_ENDS.has(error.errorCode));

export async function accessToken(): Promise<string> {
    if (!msal) throw new Error('Nicht angemeldet — ensureSignedIn() läuft vor dem ersten Render.');
    try {
        const result = await msal.acquireTokenSilent({ scopes: [apiScope()] });
        return result.accessToken;
    } catch (error) {
        if (needsInteraction(error)) {
            await msal.acquireTokenRedirect({ scopes: [apiScope()] });
        }
        throw error;
    }
}
