#!/usr/bin/env node
// Blockt Secrets in .env*-Dateien — ESLint kann das nicht, es liest keine .env-Files.
//
// Genau EIN Muster: eine VITE_-Variable, deren Name nach Secret klingt. Nur VITE_-Variablen
// erreichen das Bundle überhaupt; eine `DATABASE_URL` in einer .env ist für die SPA unsichtbar.
//
// Gescannt werden Repo-Root UND jedes apps/*-Package — vite lädt .env relativ zu seinem Root,
// also aus apps/web/.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_BUT_SECRET = /^\s*VITE_[A-Z0-9_]*(SECRET|PASSWORD|TOKEN|CONNECTION_STRING)/i;

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
        if (entry.name === '.env.example') continue;
        const abs = join(dir, entry.name);
        const label = relative(ROOT, abs) || entry.name;
        readFileSync(abs, 'utf8')
            .split(/\r?\n/)
            .forEach((line, i) => {
                if (PUBLIC_BUT_SECRET.test(line)) findings.push(`${label}:${i + 1}: ${line.trim().slice(0, 80)}`);
            });
    }
}

if (findings.length > 0) {
    console.error('Secret in einer VITE_-Variable gefunden — das landet im public Bundle:\n');
    findings.forEach((f) => console.error(`  ${f}`));
    console.error('\nDie public Konfiguration der SPA steht in .unitix/project.json (entra-Block) und');
    console.error('enthält nur öffentliche Identifikatoren. Serverseitiges gehört nach apps/api/.env —');
    console.error('und in Azure gar nicht erst in die App Settings: dort greift die Managed Identity.');
    process.exit(1);
}
