import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './',
    fullyParallel: false,
    workers: 1,
    reporter: 'html',
    timeout: 180000,
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'off',
        screenshot: 'on',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    globalSetup: '../tests/global-setup.ts',
});
