import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@/convex': path.resolve(__dirname, './convex'),
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'edge-runtime',
        reporters: ['tree'],
        include: ['convex/tests/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', 'tests/**'],
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['convex/**/*.ts', 'src/**/*.{ts,tsx}'],
            exclude: [
                '**/*.test.ts',
                '**/*.test.tsx',
                '**/tests/**',
                '**/_generated/**',
                '**/node_modules/**',
                '**/*.d.ts',
            ],
        },
    },
});
