#!/usr/bin/env node
// Der Upload geht als PUT des Browsers DIREKT gegen Blob Storage — der Speicherkonto-Host ist
// damit eine fremde Origin und muss in connect-src stehen. Fehlt er, stellt die API eine gültige
// SAS aus und der Browser weigert sich, sie zu benutzen. Konzept: docs/blob-storage.md.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PROJECT = join(ROOT, '.unitix/project.json');
const SWA_CONFIG = join(ROOT, 'apps/web/public/staticwebapp.config.json');

function fail(message) {
    console.error(`\n✖ check:csp: ${message}\n`);
    process.exit(1);
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (!existsSync(PROJECT) || !existsSync(SWA_CONFIG)) process.exit(0);

const environments = readJson(PROJECT).environments ?? {};
const accounts = [...new Set(Object.values(environments).flatMap((env) => env?.storage?.account || []))];

// Kein Speicherkonto konfiguriert = kein Blob Storage in diesem Projekt. Dann gibt es nichts zu
// erlauben, und die CSP soll den Host auch NICHT enthalten.
if (accounts.length === 0) process.exit(0);

const csp = (readJson(SWA_CONFIG).globalHeaders ?? {})['content-security-policy'];
if (!csp) fail(`${SWA_CONFIG} hat keinen content-security-policy-Header.`);

const connectSrc = csp.split(';').find((part) => part.trim().startsWith('connect-src '));
if (!connectSrc) fail('Die CSP hat keine connect-src-Direktive.');

// Ein Wildcard erlaubt jedes Azure-Konto und wäre bei einem XSS der Ausleitungskanal.
if (csp.includes('*.blob.core.windows.net')) {
    fail('Die CSP erlaubt "*.blob.core.windows.net" — das ist jedes Azure-Konto. Exakten Host eintragen.');
}

for (const account of accounts) {
    const host = `https://${account}.blob.core.windows.net`;
    if (connectSrc.includes(host)) continue;
    fail(
        `connect-src erlaubt "${host}" nicht.\n` +
            `  Aktuell: ${connectSrc.trim()}\n` +
            '  Ohne diesen Host scheitert der Datei-Upload im Browser, obwohl die API eine gültige\n' +
            '  SAS ausstellt. Ergänzen in apps/web/public/staticwebapp.config.json.',
    );
}
