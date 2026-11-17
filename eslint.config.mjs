import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
    { ignores: ['**/node_modules/**', 'backend/data/**'] },
    js.configs.recommended,
    {
        files: ['backend/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
    },
    {
        files: ['frontend/javascript/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: { ...globals.browser, lucide: 'readonly' },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    prettier,
];