// ESLint Flat Config — UNIT-IX Code Apps Hard-Rule-Enforcement.
//
// Deterministisch HIER enforced (CI-gated über `pnpm lint`):
//   - no-restricted-globals: localStorage / sessionStorage (keine Browser-Persistenz) + fetch (bare global)
//   - no-restricted-syntax:  fetch() / window.fetch / globalThis.fetch — Daten NUR über generierte Connector-Services
//   - Dependency-Direction-Boundaries (Quelle: code-app-patterns.md → "Dependency Direction"):
//       * shared/    darf NICHT aus features/ importieren        ← greift auf gelinteten Files
//       * generated/ darf NICHT aus features/ oder shared/       ← deklarativ (generated/ ist unten ignoriert,
//                                                                   schaltet scharf falls je un-ignoriert)
//     Zwei komplementäre Mechanismen:
//       1) import/no-restricted-paths  — Verzeichnis-Zonen, resolver-/pfadbasiert (fängt relative Imports;
//          volle `@/`-Alias-Auflösung sobald `eslint-import-resolver-typescript` ergänzt wird)
//       2) no-restricted-imports       — specifier-basierter Backstop, fängt `@/`-Alias-Imports OHNE Resolver
//
// NICHT hier, sondern per CODEOWNERS/Review enforced (statisch nicht zuverlässig fassbar):
//   - src/generated/** Immutability (auto-generiert, niemals manuell editieren) — daher unten aus dem Lint genommen
//   - power.config.json Immutability
//   - features/ → features/ NUR über das index.ts des Ziel-Features (Soft-Rule, ⚠️ in der Tabelle)
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

const forbiddenFetch = [
    {
        selector: "CallExpression[callee.name='fetch']",
        message: 'Externe APIs über pac code add-data-source anbinden, nicht direkt via fetch().',
    },
    {
        selector: "MemberExpression[object.name='window'][property.name='fetch']",
        message: 'Kein window.fetch — Daten über generierte Connector-Services beziehen.',
    },
    {
        selector: "MemberExpression[object.name='globalThis'][property.name='fetch']",
        message: 'Kein globalThis.fetch — Daten über generierte Connector-Services beziehen.',
    },
]

const dependencyZones = [
    {
        target: './src/shared',
        from: './src/features',
        message: 'shared/ darf nicht aus features/ importieren (bricht die Modularität — Dependency-Direction).',
    },
    {
        target: './src/generated',
        from: './src/features',
        message: 'generated/ ist autark und kennt keine App-Domänen — kein Import aus features/.',
    },
    {
        target: './src/generated',
        from: './src/shared',
        message: 'generated/ ist autark — kein Import aus shared/.',
    },
]

export default tseslint.config(
    { ignores: ['dist/**', 'src/generated/**', 'node_modules/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { import: importPlugin },
        rules: {
            'no-restricted-globals': ['error', 'localStorage', 'sessionStorage', 'fetch'],
            'no-restricted-syntax': ['error', ...forbiddenFetch],
            'import/no-restricted-paths': ['error', { zones: dependencyZones }],
        },
    },
    // Specifier-basierter Boundary-Backstop: fängt `@/`-Alias-Imports ohne Resolver.
    // Nur für shared/ (das einzige aus features/ verbotene, tatsächlich gelintete Verzeichnis).
    {
        files: ['src/shared/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/features/*', '@/features/**', '**/features/*', '**/features/**'],
                            message: 'shared/ darf nicht aus features/ importieren (Dependency-Direction).',
                        },
                    ],
                },
            ],
        },
    },
)
