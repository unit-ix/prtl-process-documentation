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

// Genau EIN Set pro Prozess — pro Request neu gebaut wäre ein HTTP-Call pro Request.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function keySet(): ReturnType<typeof createRemoteJWKSet> {
    const { ENTRA_TENANT_ID } = serverEnv();
    jwks ??= createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${ENTRA_TENANT_ID}/discovery/v2.0/keys`));
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
    return {
        objectId,
        email: typeof payload.preferred_username === 'string' ? payload.preferred_username : '',
        name: typeof payload.name === 'string' ? payload.name : '',
    };
}

export async function verifyAccessToken(token: string): Promise<Claims> {
    const { ENTRA_TENANT_ID, ENTRA_API_AUDIENCE } = serverEnv();
    try {
        const { payload } = await jwtVerify(token, keySet(), {
            issuer: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0`,
            audience: ENTRA_API_AUDIENCE,
        });
        return toClaims(payload);
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw unauthorized('Token ungültig, abgelaufen oder für eine andere Anwendung ausgestellt.');
    }
}

export function bearerToken(header: string | undefined): string {
    const match = /^Bearer (.+)$/.exec(header ?? '');
    if (!match) throw unauthorized('Kein Bearer-Token im Authorization-Header.');
    return match[1];
}
