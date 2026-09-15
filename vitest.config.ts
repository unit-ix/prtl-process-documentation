import { defineConfig } from 'vitest/config';

// Stufe 1 der Prüfsystematik (docs/pruefsystematik.md): nur was ein Mensch am Bildschirm NICHT
// sieht — Regeln, Zahlen, Grenzwerte. Kein Browser, kein Netz, keine Datenbank; das Budget für
// `pnpm verify` liegt bei 60 Sekunden.
export default defineConfig({
    test: {
        include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'scripts/**/*.test.mjs'],
        environment: 'node',
        passWithNoTests: false,
    },
});
