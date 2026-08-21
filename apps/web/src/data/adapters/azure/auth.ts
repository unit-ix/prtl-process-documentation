// Entra ID über MSAL Browser. Ablauf, Diagramm und AADSTS-Fehlertabelle: docs/auth.md.
// Bewusst ohne @azure/msal-react — der Login läuft einmal im Bootstrap, vor dem ersten Render.
import { BrowserAuthError, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { entra } from '@/shared/lib/projectConfig';

// Spiegelt REQUIRED_SCOPE in apps/api/src/auth/verify.ts — Packages können keine Konstante teilen.
const API_SCOPE_NAME = 'access_as_user';

// Aus dem Audience-GUID gebaut statt gespeichert (Application ID URI bleibt `api://<appId>`, siehe
// docs/azure-setup.md, Schritt 1). Funktion, damit die Pflichtfeld-Prüfung in client() zuerst greift.
const apiScope = (): string => `api://${entra.apiAudience}/${API_SCOPE_NAME}`;

function client(): PublicClientApplication {
    // Fail loud statt `clientId: undefined`: ein frischer Klon ohne ausgefüllten entra-Block würde
    // sonst eine SPA bauen, die erst im Browser mit einer MSAL-Meldung scheitert.
    const missing = (['tenantId', 'clientId', 'apiAudience'] as const).filter((key) => !entra[key]);
    if (missing.length > 0) {
        throw new Error(`.unitix/project.json → entra: ${missing.join(', ')} fehlt (siehe docs/azure-setup.md).`);
    }

    // External ID (CIAM): die Authority trägt die Tenant-ID auch als Host, nicht die Subdomain —
    // Workaround für einen msal-browser-Bug (#8592), sonst scheitert die Anmeldung mit
    // `endpoints_resolution_error`. docs/azure-setup.md, „Die eine zusätzliche Angabe".
    const authority = entra.subdomain
        ? `https://${entra.tenantId}.ciamlogin.com/${entra.tenantId}`
        : `https://login.microsoftonline.com/${entra.tenantId}`;

    return new PublicClientApplication({
        auth: {
            clientId: entra.clientId,
            authority,
            // Nur bei External ID: `*.ciamlogin.com` ist für MSAL kein bekannter Microsoft-Host und
            // würde ohne diesen Eintrag abgelehnt. Für den Default-Fall bewusst NICHT gesetzt — dort
            // überspränge der Eintrag die Instance Discovery und änderte damit bestehendes Verhalten.
            ...(entra.subdomain ? { knownAuthorities: [new URL(authority).hostname] } : {}),
            // Lokal http://localhost:5173, in Azure die SWA-Domain — beide müssen in der
            // App-Registrierung als Redirect-URI stehen.
            redirectUri: window.location.origin,
        },
    });
}

let msal: PublicClientApplication | null = null;

/** Bootstrap vor dem ersten Render. Ohne Anmeldung navigiert `loginRedirect` die Seite weg. */
export async function ensureSignedIn(): Promise<void> {
    const instance = client();
    await instance.initialize();

    // Muss VOR getAllAccounts() laufen (das Ergebnis steht noch im URL-Fragment) und vor dem ersten
    // Render: Entra antwortet per `response_mode=fragment` und teilt sich das Fragment mit dem
    // HashRouter. handleRedirectPromise() räumt es weg, sonst liest der Router die Auth-Antwort als Route.
    const redirectResult = await instance.handleRedirectPromise();
    const account = redirectResult?.account ?? instance.getAllAccounts()[0];

    if (!account) {
        await instance.loginRedirect({ scopes: [apiScope()] });
        return;
    }

    instance.setActiveAccount(account);
    msal = instance;
}

/**
 * Silent-Ausgänge, die nur interaktiv aufzulösen sind. `timed_out` ist der häufigste: MSAL konnte das
 * versteckte iframe nicht auslesen — etwa weil der Browser den Mandanten-Cookie darin als
 * Third-Party blockt. Keiner davon ist ein `InteractionRequiredAuthError`, deshalb die eigene Liste:
 * beide Klassen erben direkt von `AuthError`, ein `instanceof` erwischt sie also nicht mit.
 */
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

/** Access-Token für die API. Silent, solange es geht — sonst zurück in den Redirect-Flow. */
export async function accessToken(): Promise<string> {
    if (!msal) throw new Error('Nicht angemeldet — ensureSignedIn() läuft vor dem ersten Render.');
    try {
        const result = await msal.acquireTokenSilent({ scopes: [apiScope()] });
        return result.accessToken;
    } catch (error) {
        // Gegen eine Redirect-Schleife schützt MSAL selbst: eine laufende Interaktion lehnt es mit
        // `interaction_in_progress` ab.
        if (needsInteraction(error)) {
            await msal.acquireTokenRedirect({ scopes: [apiScope()] });
        }
        throw error;
    }
}
