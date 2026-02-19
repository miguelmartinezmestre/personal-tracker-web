import { defineConfig, devices } from '@playwright/test';

/**
 * Full Playwright suite (cross-browser), excluding suites migrated to Vitest.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 2,

    // Timeouts
    timeout: 60000,
    expect: {
        timeout: 10000,
    },

    retries: 0,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        // Use data-testid attribute for test selectors
        testIdAttribute: 'data-testid',
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

    // Ignore manual and suites migrated to Vitest
    testIgnore: ['**/tests-manual/**', '**/e2e/admin/**'],
});
