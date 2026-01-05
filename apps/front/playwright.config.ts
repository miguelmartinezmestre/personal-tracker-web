import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    // retries: 2,
    workers: 16,
    reporter: 'html',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        // Screenshots always for documentation purposes
        // screenshot: 'on',
        // Increase timeout for authentication flows
        // actionTimeout: 10000,
        // navigationTimeout: 10000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Global setup to ensure backend is ready
    globalSetup: './tests/global-setup.ts',
});
