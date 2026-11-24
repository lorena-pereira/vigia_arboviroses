
import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        ignores: ['node_modules/**', 'dist/**'],
    },

    js.configs.recommended,

    {
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'module',
        },

        rules: {
            'linebreak-style': 'off',
            'no-console': 'off',
            'no-unused-vars': 'warn',
        },
    },

    prettierConfig,
];
