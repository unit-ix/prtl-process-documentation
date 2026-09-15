#!/usr/bin/env node
// Ein Befehl, ein Budget: unter 60 Sekunden. Was länger dauert oder einen Browser braucht, gehört
// in die CI — docs/pruefsystematik.md. Reihenfolge nach Aussagekraft, nicht nach Laufzeit: die
// erste rote Zeile soll die wichtigste sein. Alle Stufen laufen durch, auch nach einem Rot, sonst
// verdeckt der erste Fehler die anderen und es braucht so viele Runden wie es Stufen gibt.
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const STEPS = [
    { name: 'Secrets', script: 'check:env', findet: 'Secrets, die im public Bundle landen würden' },
    { name: 'CSP', script: 'check:csp', findet: 'fehlende Hosts — Upload scheitert sonst lautlos' },
    { name: 'Tests', script: 'test', findet: 'falsche Regeln und Zahlen, die richtig aussehen' },
    { name: 'Lint', script: 'lint', findet: 'toten Code, verletzte Architektur-Grenzen' },
    { name: 'Knip', script: 'knip', findet: 'ungenutzte Dateien, Exporte, Dependencies' },
    { name: 'Build', script: 'build', findet: 'Typfehler und was nur beim echten Bauen bricht' },
];

const failed = [];
const start = performance.now();

for (const step of STEPS) {
    const began = performance.now();
    const result = spawnSync('pnpm', [step.script], { encoding: 'utf8' });
    const seconds = ((performance.now() - began) / 1000).toFixed(1);
    const ok = result.status === 0;
    console.log(`${ok ? '✅' : '❌'} ${step.name.padEnd(9)} ${seconds.padStart(5)} s   ${step.findet}`);
    if (!ok) failed.push({ name: step.name, output: `${result.stdout ?? ''}${result.stderr ?? ''}` });
}

const total = ((performance.now() - start) / 1000).toFixed(0);

if (failed.length === 0) {
    console.log(`\nAlle ${STEPS.length} Stufen grün — ${total} s.`);
    process.exit(0);
}

// Ganze Ausgabe statt gefilterter Treffer: ein Filter, der die entscheidende Zeile wegwirft, ist
// dasselbe Problem wie eine Prüfung, die blind grün ist.
const NOISE = /^(>|\s*$|Scope:|Progress:|Done in|ELIFECYCLE|\s*$)/;

for (const { name, output } of failed) {
    const lines = output
        .split('\n')
        .filter((line) => !NOISE.test(line))
        .slice(-40);
    console.log(`\n── ${name} ──\n${lines.join('\n')}`);
}

console.log(`\n${failed.length} von ${STEPS.length} Stufen rot — ${total} s.`);
process.exit(1);
