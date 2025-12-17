import { nextJsConfig } from '@repo/eslint-config/next-js';

const eslintConfig = [
    ...nextJsConfig,
    {
        ignores: [
            'node_modules/**',
            '.next/**',
            'out/**',
            'build/**',
            'next-env.d.ts',
            'convex/**/_generated/**',
        ],
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        rules: {
            // TypeScript rules
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            // React rules
            'react/no-unescaped-entities': 'error',
            'react/void-dom-elements-no-children': 'error',
            // 'react/jsx-no-literals': ['error', { noStrings: true }],

            // Next.js specific rules
            '@next/next/no-html-link-for-pages': 'error',
            '@next/next/no-img-element': 'warn',

            // General code quality
            // 'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
];

export default eslintConfig;
