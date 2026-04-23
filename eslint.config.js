import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
            'no-restricted-syntax': [
                'error',
                {
                    selector: "CallExpression[callee.name='fetch']",
                    message:
                        'Externe APIs über pac code add-data-source anbinden, nicht direkt via fetch().',
                },
            ],
        },
    },
)
