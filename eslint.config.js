// ESLint Flat Config — UNIT-IX Code Apps Hard-Rule- + Lean-Coding-Enforcement.
//
// Deterministisch HIER enforced (CI-gated über `pnpm lint`):
//   - no-restricted-globals: localStorage / sessionStorage (keine Browser-Persistenz) + fetch (bare global)
//   - no-restricted-syntax:  fetch() / window.fetch / globalThis.fetch — Daten NUR über den Data-Port
//     (Ausnahme: data/adapters/** — genau dort DARF ein Backend-Adapter fetchen, siehe Override unten)
//   - Lean-Coding-Gates (max-lines/-per-function, complexity, max-depth, max-params) auf dem
//     handgeschriebenen App-Code (features/domain/data/ports) — NICHT auf shadcn-ui/Generiertem
//   - Dependency-Direction als echte Layer-Boundaries via eslint-plugin-boundaries
//       feature → port|domain · port → adapter|domain · adapter → domain · domain → nichts
//     (fängt u. a. den kritischen Verstoß „UI greift direkt auf data/adapters/** zu")
//   - Ergänzend die pfad-/specifier-basierten Zonen (Backstop, greift auch ohne Resolver)
//
// NICHT hier, sondern per CODEOWNERS/Review enforced (statisch nicht zuverlässig fassbar):
//   - src/generated/** Immutability (auto-generiert, niemals manuell editieren) — daher unten aus dem Lint genommen
//   - power.config.json Immutability
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import boundaries from 'eslint-plugin-boundaries'

// Bare `fetch` ist im Prototyp-First-Template target-neutral verboten: UI/Hooks beziehen Daten
// AUSSCHLIESSLICH über den Data-Port (`@/data`), nie direkt. Welcher Backend darunter liegt
// (mock/supabase/dataverse), ist eine Adapter-Frage — und der mock/supabase-Adapter DARF fetchen
// (siehe Override auf data/adapters/**). Keine target-spezifische Anbindungs-Instruktion hier.
const forbiddenFetch = [
    {
        selector: "CallExpression[callee.name='fetch']",
        message: 'Kein direktes fetch() — Daten über den Data-Port (@/data) beziehen. Backend-Calls gehören in data/adapters/**.',
    },
    {
        selector: "MemberExpression[object.name='window'][property.name='fetch']",
        message: 'Kein window.fetch — Daten über den Data-Port (@/data) beziehen. Backend-Calls gehören in data/adapters/**.',
    },
    {
        selector: "MemberExpression[object.name='globalThis'][property.name='fetch']",
        message: 'Kein globalThis.fetch — Daten über den Data-Port (@/data) beziehen. Backend-Calls gehören in data/adapters/**.',
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

// Lean-Coding-Gates: mechanisch statt als Chat-Ansage. Bewusst NUR auf handgeschriebenem
// App-Code — shadcn-ui-Primitives (src/shared/components/ui/**) und Generiertes sind fremder
// bzw. auto-erzeugter Code, den diese Limits nicht sinnvoll fassen.
const leanRules = {
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 15],
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
}

// Layer-Elemente für eslint-plugin-boundaries. Reihenfolge = Priorität: der spezifischere
// adapter-Pfad muss VOR dem generischen port-Pfad (src/data) stehen, sonst würde data/adapters/**
// fälschlich als port klassifiziert.
const boundaryElements = [
    { type: 'domain', pattern: 'src/domain', mode: 'folder' },
    { type: 'adapter', pattern: 'src/data/adapters/*', mode: 'folder', capture: ['backend'] },
    { type: 'port', pattern: 'src/data', mode: 'folder' },
    { type: 'feature', pattern: 'src/features/*', mode: 'folder', capture: ['feature'] },
]

export default tseslint.config(
    // .claude/** = Submodul (code-apps-context) mit eigenem Repo + eigener Lint-Hoheit
    // (Node-Scripts wie audit-standards.mjs). Wird von der App-Config nicht mitgelintet.
    { ignores: ['dist/**', 'src/generated/**', 'node_modules/**', '.claude/**'] },
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
    // Backend-Adapter-Override: GENAU hier (und nur hier) darf ein Adapter fetchen — er ist die
    // eine Stelle, die mit einem echten Backend spricht. localStorage/sessionStorage bleiben tabu.
    {
        files: ['src/data/adapters/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
            'no-restricted-syntax': 'off',
        },
    },
    // Lean-Gates NUR auf handgeschriebenem App-Code.
    {
        files: [
            'src/features/**/*.{ts,tsx}',
            'src/domain/**/*.{ts,tsx}',
            'src/data/ports/**/*.{ts,tsx}',
        ],
        rules: leanRules,
    },
    // Layer-Boundaries (Dependency Direction als echte Grenze, resolver-basiert).
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { boundaries },
        settings: {
            'boundaries/elements': boundaryElements,
            'import/resolver': {
                typescript: { project: './tsconfig.json', alwaysTryTypes: true },
            },
        },
        rules: {
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        { from: ['feature'], allow: ['port', 'domain'] },
                        { from: ['port'], allow: ['adapter', 'domain'] },
                        // adapter → port: der Adapter MUSS das Port-Interface importieren, das er
                        // implementiert (Ports & Adapters). Der kritische Verstoß bleibt verboten:
                        // feature → adapter greift NICHT (feature darf nur port|domain).
                        { from: ['adapter'], allow: ['port', 'domain'] },
                        { from: ['domain'], allow: [] },
                    ],
                },
            ],
            // Öffentliche Einstiegspunkte je Layer: der Port wird über @/data (index.ts) bzw. seine
            // Interface-Files (ports/*) angesprochen — nie über einen Deep-Import in data/adapters/**.
            'boundaries/entry-point': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        { target: ['port'], allow: ['index.ts', 'ports/*'] },
                        { target: ['feature'], allow: 'index.ts' },
                        { target: ['adapter'], allow: '**' },
                        { target: ['domain'], allow: '**' },
                    ],
                },
            ],
        },
    },
    // Specifier-basierter Boundary-Backstop: fängt `@/`-Alias-Imports auch ohne Resolver.
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
