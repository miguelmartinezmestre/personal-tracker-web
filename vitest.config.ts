import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/convex': path.resolve(__dirname, './convex'),
        },
    },
    test: {
        reporters: ['tree'],
        include: ['convex/tests/**/*.test.ts', 'src/features/**/*.test.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', 'tests/**'],
        environment: 'jsdom',
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
