import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Workers inherit the zone at spawn time. A zone ahead of UTC makes date code that confuses
// the local and UTC calendar days fail around midnight instead of passing on UTC machines.
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
        include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/frontend',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['**/*.test.*', '**/*.d.ts'],
        },
    },
});
