import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './apps/front/src'),
            '@repo/backend': path.resolve(__dirname, './packages/backend'),
            '@repo/ui': path.resolve(__dirname, './packages/ui/src'),
        },
    },
    test: {
        setupFiles: ['./apps/front/vitest.setup.ts'],
        reporters: ['tree'],
        include: [
            'packages/backend/convex/tests/**/*.test.ts',
            'apps/front/src/features/**/*.test.{ts,tsx}',
            'apps/front/tests/**/*.test.{ts,tsx}',
            'apps/front/tests/**/*.spec.{ts,tsx}',
        ],
        exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        environment: 'jsdom',
        globals: true,
    },
});
