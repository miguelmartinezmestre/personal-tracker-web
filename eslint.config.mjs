import convexPlugin from '@convex-dev/eslint-plugin';
import tseslint from 'typescript-eslint';

// Oxlint JS plugins lack the parserServices that @convex-dev/eslint-plugin needs.
export default [
    {
        ignores: [
            'convex/_generated/**',
            'convex/betterAuth/_generated/**',
            'convex/betterAuth/generatedSchema.ts',
        ],
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
    // Inline eslint-disable comments trip oxlint's unused-directive check, so exceptions live here.
    {
        // NODE_ENV comes from the Convex runtime; convex.config.ts cannot declare it.
        files: ['convex/shared/env.ts'],
        rules: { '@convex-dev/no-process-env': 'off' },
    },
    {
        // categories keeps by_organization to list in creation order; by_organization_name sorts by name.
        files: ['convex/schema.ts'],
        rules: { '@convex-dev/no-duplicate-indexes': 'off' },
    },
    {
        files: ['convex/tests/**/*.ts'],
        rules: {
            '@convex-dev/no-filter-in-query': 'off',
            '@convex-dev/no-collect-in-query': 'off',
            '@convex-dev/no-process-env': 'off',
        },
    },
];
