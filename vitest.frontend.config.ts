import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Set before workers spawn: a zone ahead of UTC exposes local/UTC calendar-day mix-ups.
process.env.TZ = 'Europe/Madrid';

export default defineConfig({
    resolve: {
        alias: {
            '@/convex': path.resolve('convex'),
            '@': path.resolve('src'),
        },
    },
    oxc: { jsx: { runtime: 'automatic' } },
    test: {
        environment: 'jsdom',
        pool: 'threads',
        maxWorkers: 1,
        setupFiles: ['./tests/frontend-setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/frontend',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['**/*.test.*', '**/*.d.ts'],
        },
    },
});
