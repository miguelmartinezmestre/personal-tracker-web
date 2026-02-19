import { defineConfig, devices } from '@playwright/test';

/**
 * Fast Playwright suite for local/PR feedback.
 * Full cross-browser suite lives in playwright.full.config.ts.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 2,

    // Timeouts
    timeout: 60000, // 1 minute max per test
    expect: {
        timeout: 10000, // 10s for assertions
    },

    retries: 0,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        // Use data-testid attribute for test selectors
        testIdAttribute: 'data-testid',

        // Timeouts
        // navigationTimeout: 15000,
        // actionTimeout: 10000,
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
        },
    ],

    // Global setup to ensure backend is ready
    globalSetup: './tests/config/global-setup.ts',

    // Ignore manual and suites migrated to Vitest
    testIgnore: ['**/tests-manual/**', '**/e2e/admin/**'],
});
