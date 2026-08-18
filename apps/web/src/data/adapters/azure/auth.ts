// Entra ID über MSAL Browser. Ablauf, Diagramm und AADSTS-Fehlertabelle: docs/auth.md.
// Bewusst ohne @azure/msal-react — der Login läuft einmal im Bootstrap, vor dem ersten Render.
import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { entra } from '@/shared/lib/projectConfig';

function client(): PublicClientApplication {
    // Fail loud statt `clientId: undefined`: ein frischer Klon ohne ausgefüllten entra-Block würde
    // sonst eine SPA bauen, die erst im Browser mit einer MSAL-Meldung scheitert.
    const missing = (['tenantId', 'clientId', 'apiScope'] as const).filter((key) => !entra[key]);
    if (missing.length > 0) {
        throw new Error(`.unitix/project.json → entra: ${missing.join(', ')} fehlt (siehe docs/azure-setup.md).`);
    }

    return new PublicClientApplication({
        auth: {
            clientId: entra.clientId,
            authority: `https://login.microsoftonline.com/${entra.tenantId}`,
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
        await instance.loginRedirect({ scopes: [entra.apiScope] });
        return;
    }

    instance.setActiveAccount(account);
    msal = instance;
}

/** Access-Token für die API. Silent, solange es geht — sonst zurück in den Redirect-Flow. */
export async function accessToken(): Promise<string> {
    if (!msal) throw new Error('Nicht angemeldet — ensureSignedIn() läuft vor dem ersten Render.');
    try {
        const result = await msal.acquireTokenSilent({ scopes: [entra.apiScope] });
        return result.accessToken;
    } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
            await msal.acquireTokenRedirect({ scopes: [entra.apiScope] });
        }
        throw error;
    }
}
