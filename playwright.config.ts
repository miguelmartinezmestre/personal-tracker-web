import { defineConfig, devices } from '@playwright/test';

/**
 * Fast Playwright suite for local/PR feedback.
 * Full cross-browser suite lives in playwright.full.config.ts.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 4,

    // Timeouts (increased for auth + Convex sync; networkidle removed in favor of load)
    timeout: 90000,
    expect: {
        timeout: 5000,
    },

    retries: 0,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        // Use data-testid attribute for test selectors
        testIdAttribute: 'data-testid',

        navigationTimeout: 45000,
        actionTimeout: 15000,
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
