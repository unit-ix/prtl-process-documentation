// ESLint Flat Config — UNIT-IX Code Apps Hard-Rules + Lean-Coding-Gates.
// Alles hier ist über `pnpm lint` (Teil von `pnpm verify`) CI-blockierend:
//   - kein localStorage/sessionStorage, kein direktes fetch (Ausnahme: data/adapters/**)
//   - kein BrowserRouter, kein Next.js/SSR — das Template ist eine statische SPA
//   - Lean-Gates (max-lines, complexity, …) auf handgeschriebenem App-Code, nicht auf shadcn/Generiertem
//   - Layer-Boundaries: feature → port|domain · port → adapter|domain · adapter → port|domain · domain → ∅
//   - react-hooks/rules-of-hooks auf dem gesamten src-Baum
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'

// UI und Hooks beziehen Daten ausschließlich über den Data-Port (`@/data`), nie direkt. Welches
// Backend darunter liegt, ist eine Adapter-Frage — und Adapter DÜRFEN fetchen (Override unten).
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

// Das Template ist per Design eine statische SPA mit HashRouter (überlebt den späteren
// Dataverse-iframe, macht _redirects auf Cloudflare überflüssig). BrowserRouter bräuchte
// Server-Routing, Next.js/SSR einen Server — beides gibt es hier nie.
// Bewusst als no-restricted-imports (nicht -syntax): der Adapter-Override unten schaltet
// no-restricted-syntax ab, diese Regel soll aber überall gelten.
const forbiddenSpaImports = {
    paths: [
        {
            name: 'react-router-dom',
            importNames: ['BrowserRouter', 'createBrowserRouter'],
            message: 'Kein BrowserRouter — statische SPA, HashRouter verwenden.',
        },
    ],
    patterns: [
        {
            group: ['next', 'next/*'],
            message: 'Kein Next.js/SSR — Code Apps sind reine Browser-SPAs ohne Server.',
        },
    ],
}

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

// Lean-Coding-Gates — nur auf handgeschriebenem App-Code. shadcn-ui-Primitives und Generiertes
// sind fremder bzw. auto-erzeugter Code, den diese Limits nicht sinnvoll fassen.
const leanRules = {
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 15],
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
}

// Layer-Elemente für eslint-plugin-boundaries. Reihenfolge = Priorität: der spezifischere
// adapter-Pfad muss VOR dem generischen port-Pfad (src/data) stehen.
const boundaryElements = [
    { type: 'domain', pattern: 'src/domain', mode: 'folder' },
    { type: 'adapter', pattern: 'src/data/adapters/*', mode: 'folder', capture: ['backend'] },
    { type: 'port', pattern: 'src/data', mode: 'folder' },
    { type: 'feature', pattern: 'src/features/*', mode: 'folder', capture: ['feature'] },
]

export default tseslint.config(
    // .claude/** = Submodul mit eigenem Repo, scripts/** = Node-Tooling (kein App-Code).
    // Beide haben eigene Lint-Hoheit und sind aus der App-Config genommen.
    { ignores: ['dist/**', 'src/generated/**', 'node_modules/**', '.claude/**', 'scripts/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { import: importPlugin },
        rules: {
            'no-restricted-globals': ['error', 'localStorage', 'sessionStorage', 'fetch'],
            'no-restricted-syntax': ['error', ...forbiddenFetch],
            'import/no-restricted-paths': ['error', { zones: dependencyZones }],
            'no-restricted-imports': ['error', forbiddenSpaImports],
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
    // Rules of Hooks — auf ALLEM App-Code inkl. shared/ui: ein Hook-Verstoß ist ein echter
    // Laufzeit-Bug, kein Stil-Thema. Bewusst breiter gescopt als die Lean-Gates.
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            // 'warn' der Konvention halber, aber `pnpm lint` läuft mit --max-warnings 0 —
            // faktisch also ein Fehler und CI-blockierend. Wer lockern will, ändert das
            // Lint-Script, nicht die Severity.
            'react-hooks/exhaustive-deps': 'warn',
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
                        // adapter → port: der Adapter MUSS das Interface importieren, das er
                        // implementiert. Der kritische Verstoß feature → adapter bleibt verboten.
                        { from: ['adapter'], allow: ['port', 'domain'] },
                        { from: ['domain'], allow: [] },
                    ],
                },
            ],
            // Öffentliche Einstiegspunkte je Layer: der Port über @/data bzw. ports/* —
            // nie per Deep-Import in data/adapters/**.
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
    // Die SPA-Restriktionen werden mitgeführt, weil diese Rule-Config die globale ersetzt.
    {
        files: ['src/shared/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: forbiddenSpaImports.paths,
                    patterns: [
                        ...forbiddenSpaImports.patterns,
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
