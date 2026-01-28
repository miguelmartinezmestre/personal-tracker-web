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
        setupFiles: ['./vitest.setup.ts'],
        reporters: ['tree'],
        include: [
            'convex/tests/**/*.test.ts',
            'src/features/**/*.test.{ts,tsx}',
            'tests/**/*.test.{ts,tsx}',
            'tests/**/*.spec.{ts,tsx}',
        ],
        exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', 'convex/_generated/**'],
        environment: 'jsdom',
        globals: true,
    },
});
