// JWT-Prüfung gegen Entra ID. Was ohne die jeweilige Prüfung möglich wäre: docs/auth.md.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { serverEnv } from '../env.js';
import { ApiError, unauthorized } from '../http/errors.js';

export interface Claims {
    /** Stabile Nutzer-id im Mandanten (`oid`) — das ist der Schlüssel, nicht die E-Mail. */
    readonly objectId: string;
    readonly email: string;
    readonly name: string;
}

// External ID (CIAM): `iss` trägt die Tenant-ID als Host, `jwks_uri` die Subdomain — kein Tippfehler,
// sondern Microsofts tatsächliches Verhalten. docs/azure-decisions.md, „Der Host-Unterschied bei ciamlogin.com".
function issuer(): string {
    const { ENTRA_TENANT_ID, ENTRA_SUBDOMAIN } = serverEnv();
    const host = ENTRA_SUBDOMAIN ? `${ENTRA_TENANT_ID}.ciamlogin.com` : 'login.microsoftonline.com';
    return `https://${host}/${ENTRA_TENANT_ID}/v2.0`;
}

function jwksUri(): string {
    const { ENTRA_TENANT_ID, ENTRA_SUBDOMAIN } = serverEnv();
    const host = ENTRA_SUBDOMAIN ? `${ENTRA_SUBDOMAIN}.ciamlogin.com` : 'login.microsoftonline.com';
    return `https://${host}/${ENTRA_TENANT_ID}/discovery/v2.0/keys`;
}

// Genau EIN Set pro Prozess — pro Request neu gebaut wäre ein HTTP-Call pro Request.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function keySet(): ReturnType<typeof createRemoteJWKSet> {
    jwks ??= createRemoteJWKSet(new URL(jwksUri()));
    return jwks;
}

const REQUIRED_SCOPE = 'access_as_user';

function toClaims(payload: JWTPayload): Claims {
    // Nicht redundant: `scp` trägt nur ein delegiertes Access-Token, ein ID-Token hat den Claim nie.
    // Damit fällt eine falsch zusammengelegte App-Registrierung hier auf, nicht im Schadensfall.
    const scopes = typeof payload.scp === 'string' ? payload.scp.split(' ') : [];
    if (!scopes.includes(REQUIRED_SCOPE)) {
        throw unauthorized(`Token ohne Scope "${REQUIRED_SCOPE}" — ID-Token statt Access-Token?`);
    }

    const objectId = typeof payload.oid === 'string' ? payload.oid : payload.sub;
    if (!objectId) throw unauthorized('Token ohne Nutzer-Identität (weder oid noch sub).');
    // External ID liefert die Adresse je nach konfiguriertem Optional Claim unter `email` statt
    // `preferred_username` — föderierte Nutzer hätten sonst eine leere E-Mail.
    const mail = payload.preferred_username ?? payload.email;
    return {
        objectId,
        email: typeof mail === 'string' ? mail : '',
        name: typeof payload.name === 'string' ? payload.name : '',
    };
}

export async function verifyAccessToken(token: string): Promise<Claims> {
    const { ENTRA_API_AUDIENCE } = serverEnv();
    try {
        const { payload } = await jwtVerify(token, keySet(), {
            issuer: issuer(),
            audience: ENTRA_API_AUDIENCE,
        });
        return toClaims(payload);
    } catch (error) {
        if (error instanceof ApiError) throw error;
        // Die Antwort an den Client bleibt bewusst generisch (kein Detail über iss/aud/exp nach
        // außen) — der jose-Fehler dahinter landet aber im Log, sonst ist diese 401 unlösbar blind.
        console.error('[auth] Tokenprüfung fehlgeschlagen:', error);
        throw unauthorized('Token ungültig, abgelaufen oder für eine andere Anwendung ausgestellt.');
    }
}

export function bearerToken(header: string | undefined): string {
    const match = /^Bearer (.+)$/.exec(header ?? '');
    if (!match) throw unauthorized('Kein Bearer-Token im Authorization-Header.');
    return match[1];
}
