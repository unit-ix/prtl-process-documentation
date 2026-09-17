// Die Regeln von check:csp und check:env als reine Funktionen — damit sie einen Selbsttest
// bekommen können. Eine Prüfung, die blind grün ist, sieht aus wie eine, die nichts findet:
// docs/pruefsystematik.md, Falle 2.

export const PUBLIC_BUT_SECRET = /^\s*VITE_[A-Z0-9_]*(SECRET|PASSWORD|TOKEN|CONNECTION_STRING)/i;

export function secretLines(content) {
    return content
        .split(/\r?\n/)
        .map((text, index) => ({ line: index + 1, text: text.trim() }))
        .filter(({ text }) => PUBLIC_BUT_SECRET.test(text));
}

export const BLOB_WILDCARD = '*.blob.core.windows.net';

export function cspProblems({ accounts, csp }) {
    if (accounts.length === 0) return [];
    if (!csp) return ['Kein content-security-policy-Header.'];

    if (csp.includes(BLOB_WILDCARD)) {
        return [`Die CSP erlaubt "${BLOB_WILDCARD}" — das ist jedes Azure-Konto. Exakten Host eintragen.`];
    }

    const connectSrc = csp.split(';').find((part) => part.trim().startsWith('connect-src '));
    if (!connectSrc) return ['Die CSP hat keine connect-src-Direktive.'];

    return accounts
        .map((account) => `https://${account}.blob.core.windows.net`)
        .filter((host) => !connectSrc.includes(host))
        .map((host) => `connect-src erlaubt "${host}" nicht.\n  Aktuell: ${connectSrc.trim()}`);
}
