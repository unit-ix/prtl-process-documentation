#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_BUT_SECRET = /^\s*VITE_[A-Z0-9_]*(SECRET|PASSWORD|TOKEN|CONNECTION_STRING)/i;

function appDirs() {
    const appsDir = join(ROOT, 'apps');
    if (!existsSync(appsDir)) return [];
    return readdirSync(appsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(appsDir, entry.name));
}

function envFiles(dir) {
    return readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.startsWith('.env') && entry.name !== '.env.example')
        .map((entry) => join(dir, entry.name));
}

const label = (abs) => relative(ROOT, abs) || abs;

const misplaced = appDirs().flatMap(envFiles);
if (misplaced.length > 0) {
    console.error('.env in einem apps/*-Package gefunden — es gibt genau EINE .env, im Repo-Root:\n');
    misplaced.forEach((abs) => console.error(`  ${label(abs)}`));
    console.error('\n`pnpm deploy` kopiert das Package-Verzeichnis, eine .env darin landet im Deploy-ZIP.');
    console.error('Inhalt in die Root-.env verschieben (Vorlage: .env.example) — serverseitige Defaults');
    console.error('stehen ohnehin in .unitix/project.json, siehe docs/azure-runbook.md, Schritt 3b.');
    process.exit(1);
}

const findings = [];
for (const dir of [ROOT, ...appDirs()]) {
    for (const abs of envFiles(dir)) {
        readFileSync(abs, 'utf8')
            .split(/\r?\n/)
            .forEach((line, i) => {
                if (PUBLIC_BUT_SECRET.test(line)) findings.push(`${label(abs)}:${i + 1}: ${line.trim().slice(0, 80)}`);
            });
    }
}

if (findings.length > 0) {
    console.error('Secret in einer VITE_-Variable gefunden — das landet im public Bundle:\n');
    findings.forEach((f) => console.error(`  ${f}`));
    console.error('\nDie public Konfiguration der SPA steht in .unitix/project.json (entra-Block) und');
    console.error('enthält nur öffentliche Identifikatoren. Serverseitiges gehört in den pg-Block bzw.');
    console.error('in Azure in die App Settings — dort greift für die DB die Managed Identity.');
    process.exit(1);
}
