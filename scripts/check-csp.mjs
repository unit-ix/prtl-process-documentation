#!/usr/bin/env node
// Der Upload geht als PUT des Browsers DIREKT gegen Blob Storage — der Speicherkonto-Host ist
// damit eine fremde Origin und muss in connect-src stehen. Fehlt er, stellt die API eine gültige
// SAS aus und der Browser weigert sich, sie zu benutzen. Konzept: .claude/docs/patterns-azure.md.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cspProblems } from './lib/checks.mjs';

const ROOT = process.cwd();
const PROJECT = join(ROOT, '.unitix/project.json');
const SWA_CONFIG = join(ROOT, 'apps/web/public/staticwebapp.config.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (!existsSync(PROJECT) || !existsSync(SWA_CONFIG)) process.exit(0);

const environments = readJson(PROJECT).environments ?? {};
const accounts = [...new Set(Object.values(environments).flatMap((env) => env?.storage?.account || []))];
const csp = (readJson(SWA_CONFIG).globalHeaders ?? {})['content-security-policy'];

const problems = cspProblems({ accounts, csp });
if (problems.length > 0) {
    console.error(`\n\u2716 check:csp: ${problems.join('\n')}\n`);
    console.error('  Ohne den Host scheitert der Datei-Upload im Browser, obwohl die API eine gültige SAS');
    console.error('  ausstellt. Ergänzen in apps/web/public/staticwebapp.config.json.\n');
    process.exit(1);
}
