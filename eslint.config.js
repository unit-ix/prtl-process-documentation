import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'

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
        target: './apps/web/src/shared',
        from: './apps/web/src/features',
        message: 'shared/ darf nicht aus features/ importieren (bricht die Modularität — Dependency-Direction).',
    },
    {
        target: './apps/web/src/generated',
        from: './apps/web/src/features',
        message: 'generated/ ist autark und kennt keine App-Domänen — kein Import aus features/.',
    },
    {
        target: './apps/web/src/generated',
        from: './apps/web/src/shared',
        message: 'generated/ ist autark — kein Import aus shared/.',
    },
]

const leanRules = {
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 15],
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
}

const boundaryElements = [
    { type: 'domain', pattern: 'apps/web/src/domain', mode: 'folder' },
    { type: 'adapter', pattern: 'apps/web/src/data/adapters/*', mode: 'folder', capture: ['backend'] },
    { type: 'port', pattern: 'apps/web/src/data', mode: 'folder' },
    { type: 'feature', pattern: 'apps/web/src/features/*', mode: 'folder', capture: ['feature'] },
]

export default tseslint.config(
    { ignores: ['**/dist/**', 'apps/web/src/generated/**', '**/node_modules/**', '.claude/**', 'scripts/**'] },
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
    {
        files: ['apps/web/src/data/adapters/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
            'no-restricted-syntax': 'off',
        },
    },
    {
        files: ['apps/api/src/**/*.ts'],
        rules: {
            ...leanRules,
            'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
            'no-restricted-syntax': 'off',
            'no-restricted-imports': 'off',
        },
    },
    {
        files: ['apps/web/src/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        files: [
            'apps/web/src/features/**/*.{ts,tsx}',
            'apps/web/src/domain/**/*.{ts,tsx}',
            'apps/web/src/data/ports/**/*.{ts,tsx}',
        ],
        rules: leanRules,
    },
    {
        files: ['apps/web/src/**/*.{ts,tsx}'],
        plugins: { boundaries },
        settings: {
            'boundaries/elements': boundaryElements,
            'import/resolver': {
                typescript: { project: './apps/web/tsconfig.json', alwaysTryTypes: true },
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
                        { from: ['adapter'], allow: ['port', 'domain'] },
                        { from: ['domain'], allow: [] },
                    ],
                },
            ],
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
    {
        files: ['apps/web/src/shared/**/*.{ts,tsx}'],
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
