import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@/convex': path.resolve('convex'),
            '@': path.resolve('src'),
            '@shared': path.resolve('shared'),
        },
    },
    oxc: { jsx: { runtime: 'automatic' } },
    test: {
        environment: 'jsdom',
        pool: 'threads',
        maxWorkers: 1,
        setupFiles: ['./tests/frontend-setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'scripts/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/frontend',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{ts,tsx}', 'shared/**/*.ts'],
            exclude: ['**/*.test.*', '**/*.d.ts'],
        },
    },
});
