#!/usr/bin/env node
// Blockt Secrets in .env*-Dateien. ESLint kann das nicht: es liest keine .env-Files.
// Warum es zählt: Vite kompiliert JEDE VITE_*-Variable ins public Bundle — ein
// service_role-Key in .env landet damit im Browser jedes Besuchers.
//
// Gescannt werden die Repo-Root UND jedes apps/*-Package. Der Grund ist nicht Gründlichkeit,
// sondern Notwendigkeit: Vite lädt .env relativ zu seinem Root, also aus apps/web/. Würde nur
// die Repo-Root gescannt, wäre genau die eine Datei unsichtbar, die im Bundle landet.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SECRET = /service_role|SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY/i;

function scanRoots() {
    const roots = [ROOT];
    const appsDir = join(ROOT, 'apps');
    if (!existsSync(appsDir)) return roots;
    for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
        if (entry.isDirectory()) roots.push(join(appsDir, entry.name));
    }
    return roots;
}

const findings = [];
for (const dir of scanRoots()) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.startsWith('.env')) continue;
        const abs = join(dir, entry.name);
        const label = relative(ROOT, abs) || entry.name;
        readFileSync(abs, 'utf8')
            .split(/\r?\n/)
            .forEach((line, i) => {
                if (SECRET.test(line)) findings.push(`${label}:${i + 1}: ${line.trim().slice(0, 80)}`);
            });
    }
}

if (findings.length > 0) {
    console.error('Secret in .env gefunden — gehört NIE ins Bundle:\n');
    findings.forEach((f) => console.error(`  ${f}`));
    console.error('\nPublic sind nur VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY.');
    console.error('Privilegierte Keys gehören in die Edge-Function-Env, nicht ins Frontend.');
    process.exit(1);
}
