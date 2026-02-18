import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
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
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
            },
        },
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
            },
        },
    ],

    // Global setup to ensure backend is ready
    globalSetup: './tests/config/global-setup.ts',

    // Ignore backup tests and manual tests
    testIgnore: ['**/tests-manual/**'],
});
