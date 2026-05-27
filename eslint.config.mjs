import js from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import pluginNext from '@next/eslint-plugin-next';
import convexPlugin from '@convex-dev/eslint-plugin';

const eslintConfig = [
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    globalIgnores([
        '.next/**',
        '.next-e2e/**',
        '.next-e2e*/**',
        '.next-e2e-authenticated/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
        'node_modules/**',
        'convex/_generated/**',
        'dist/**',
        'infrastructure/data/**',
        'infrastructure/data-dev/**',
        'infrastructure/mysql-data/**',
        'infrastructure/mysql-data-dev/**',
        'tests/**',
        'tests/manual/**',
        'src/components/ui/**',
    ]),
    {
        ...pluginReact.configs.flat.recommended,
        languageOptions: {
            ...pluginReact.configs.flat.recommended.languageOptions,
            globals: {
                ...globals.serviceworker,
            },
        },
    },
    {
        plugins: {
            '@next/next': pluginNext,
        },
        rules: {
            ...pluginNext.configs.recommended.rules,
            ...pluginNext.configs['core-web-vitals'].rules,
        },
    },
    {
        plugins: {
            'react-hooks': pluginReactHooks,
        },
        settings: { react: { version: 'detect' } },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
        },
    },
    {
        rules: {
            'max-lines': ['error', { max: 650, skipBlankLines: true, skipComments: true }],
        },
    },
    {
        files: ['scripts/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ['convex/**/*.ts'],
        plugins: {
            '@convex-dev': convexPlugin,
        },
        rules: {
            '@convex-dev/no-old-registered-function-syntax': 'error',
            '@convex-dev/require-args-validator': 'error',
            '@convex-dev/explicit-table-ids': 'error',
            '@convex-dev/import-wrong-runtime': 'off',
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'react/no-unescaped-entities': 'error',
            'react/void-dom-elements-no-children': 'error',
            'react/no-multi-comp': ['error', { ignoreStateless: true }],
            '@next/next/no-html-link-for-pages': 'error',
            '@next/next/no-img-element': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['convex/react'],
                            importNames: ['useQuery', 'useMutation'],
                            message:
                                'Use @tanstack/react-query hooks instead of convex/react hooks',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['convex/**/*.ts', 'src/**/*.{ts,tsx}'],
        ignores: ['src/components/ui/**'],
        rules: {
            'id-length': [
                'warn',
                {
                    min: 2,
                    exceptions: ['t', 'e', 'q', 'i', 'j', 'k', 'a', 'b', '_', 'z'],
                    properties: 'never',
                },
            ],
        },
    },
];

export default eslintConfig;
