import { defineConfig, devices } from '@playwright/test';

const authenticatedTests = [
    '**/e2e/objectives/**',
    '**/e2e/categories/**',
    '**/e2e/notifications/**',
    '**/e2e/organizations/**',
    '**/e2e/settings/**',
    '**/e2e/dashboard/**',
    '**/e2e/achievements/**',
    '**/e2e/sessions/**',
    '**/e2e/i18n/**',
    '**/e2e/ui/**',
];

const unauthenticatedTests = ['**/e2e/auth/**', '**/smoke/**'];

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,

    timeout: 45_000,
    expect: {
        timeout: 5000,
    },

    retries: 0,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        testIdAttribute: 'data-testid',
        navigationTimeout: 20_000,
        actionTimeout: 10_000,
    },

    projects: [
        {
            name: 'setup',
            testMatch: /.*auth\.stack\.setup\.ts/,
            workers: 1,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
        },
        {
            name: 'chromium',
            dependencies: ['setup'],
            workers: 3,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: authenticatedTests,
        },
        {
            name: 'chromium-auth-smoke',
            dependencies: ['setup'],
            workers: 3,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: unauthenticatedTests,
        },
        {
            name: 'firefox-compat',
            dependencies: ['setup'],
            workers: 2,
            grep: /@cross-browser/,
            use: {
                ...devices['Desktop Firefox'],
            },
            testMatch: unauthenticatedTests,
        },
        {
            name: 'webkit-compat',
            dependencies: ['setup'],
            workers: 2,
            grep: /@cross-browser/,
            use: {
                ...devices['Desktop Safari'],
            },
            testMatch: unauthenticatedTests,
        },
    ],

    globalSetup: './tests/config/global-setup.ts',

    testIgnore: ['**/tests-manual/**', '**/e2e/admin/**'],
});
