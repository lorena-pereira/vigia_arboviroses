
import js from '@eslint/js';
import globals from 'globals';
import ljharbConfig from '@ljharb/eslint-config/flat';
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        ignores: ['node_modules/**', 'dist/**'],
    },

    js.configs.recommended,

    ...ljharbConfig,

    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            complexity: 'off',
            'consistent-return': 'warn',
            eqeqeq: ['error', 'allow-null'],
            'func-name-matching': 'off',
            'id-length': [
                'error',
                {
                    max: 25,
                    min: 1,
                    properties: 'never',
                },
            ],
            indent: ['error', 4],
            'max-lines': 'off',
            'max-lines-per-function': ['error', { max: 150 }],
            'max-params': ['error', 20],
            'max-statements': ['error', 100],
            'multiline-comment-style': 'off',
            'no-continue': 'warn',
            'no-magic-numbers': 'off',
            'no-restricted-syntax': [
                'error',
                'BreakStatement',
                'DebuggerStatement',
                'ForInStatement',
                'LabeledStatement',
                'WithStatement',
            ],
            'linebreak-style': 'off',
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },

    {
        files: ['test/**'],
        rules: {
            'function-paren-newline': 'off',
            'max-lines-per-function': 'off',
            'max-statements': 'off',
            'no-buffer-constructor': 'off',
            'no-extend-native': 'off',
            'no-throw-literal': 'off',
        },
    },

    // Prettier prevalece sobre regras de formatação conflitantes do ESLint.
    prettierConfig,
];
