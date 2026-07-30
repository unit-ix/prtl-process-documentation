#!/usr/bin/env node
// Blockt Secrets in .env*-Dateien. ESLint kann das nicht: es liest keine .env-Files.
// Warum es zählt: Vite kompiliert JEDE VITE_*-Variable ins public Bundle — ein
// service_role-Key in .env landet damit im Browser jedes Besuchers.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SECRET = /service_role|SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY/i;

const findings = [];
for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith('.env')) continue;
    readFileSync(join(ROOT, entry.name), 'utf8')
        .split(/\r?\n/)
        .forEach((line, i) => {
            if (SECRET.test(line)) findings.push(`${entry.name}:${i + 1}: ${line.trim().slice(0, 80)}`);
        });
}

if (findings.length > 0) {
    console.error('Secret in .env gefunden — gehört NIE ins Bundle:\n');
    findings.forEach((f) => console.error(`  ${f}`));
    console.error('\nPublic sind nur VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY.');
    console.error('Privilegierte Keys gehören in die Edge-Function-Env, nicht ins Frontend.');
    process.exit(1);
}
