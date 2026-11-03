import convexPlugin from '@convex-dev/eslint-plugin';
import tseslint from 'typescript-eslint';

// Oxlint JS plugins lack the parserServices that @convex-dev/eslint-plugin needs.
export default [
    {
        ignores: ['convex/_generated/**', 'convex/generated/**'],
    },
    {
        files: ['convex/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './convex/tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    ...convexPlugin.configs.recommended,
    {
        files: ['convex/**/*.ts'],
        rules: {
            '@convex-dev/import-wrong-runtime': 'error',
            '@convex-dev/no-filter-in-query': 'error',
            '@convex-dev/no-collect-in-query': 'error',
        },
    },
    {
        files: ['convex/tests/**/*.ts'],
        rules: {
            '@convex-dev/no-filter-in-query': 'off',
            '@convex-dev/no-collect-in-query': 'off',
        },
    },
];
