import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 2,

    timeout: 60000,
    expect: {
        timeout: 10000,
    },

    retries: 0,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

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

    globalSetup: './tests/config/global-setup.ts',

    testIgnore: ['**/tests-manual/**', '**/e2e/admin/**'],
});
