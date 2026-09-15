import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Stufe 1 der Prüfsystematik (docs/pruefsystematik.md): nur was ein Mensch am Bildschirm NICHT
// sieht — Regeln, Zahlen, Grenzwerte. Kein Browser, kein Netz, keine Datenbank; das Budget für
// `pnpm verify` liegt bei 60 Sekunden.
export default defineConfig({
    resolve: {
        // Gegen die QUELLE testen, nie gegen packages/domain/dist: ein veralteter Build würde sonst
        // grüne Tests für Code liefern, der so nicht mehr existiert.
        alias: {
            '@app/domain': fileURLToPath(new URL('./packages/domain/src/index.ts', import.meta.url)),
        },
    },
    test: {
        include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'scripts/**/*.test.mjs'],
        environment: 'node',
        passWithNoTests: false,
    },
});
