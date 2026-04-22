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
/** Only Chromium runs the smoke suite; Firefox/WebKit run auth e2e (duplicate smoke is expensive). */
const unauthenticatedNoSmoke = ['**/e2e/auth/**'];

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    /** Exhaustive mode favors stability; daily configs are the optimized entrypoints. */
    workers: 1,

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
            testMatch: /.*auth\.full\.setup\.ts/,
            timeout: 120_000,
            workers: 1,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
                navigationTimeout: 15000,
                actionTimeout: 10000,
            },
        },

        // --- Chromium ---
        {
            name: 'chromium',
            dependencies: ['setup'],
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
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: unauthenticatedTests,
        },

        // --- Firefox ---
        {
            name: 'firefox',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Firefox'],
            },
            testMatch: authenticatedTests,
        },
        {
            name: 'firefox-auth-smoke',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Firefox'],
            },
            testMatch: unauthenticatedNoSmoke,
        },

        // --- WebKit ---
        {
            name: 'webkit',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Safari'],
            },
            testMatch: authenticatedTests,
        },
        {
            name: 'webkit-auth-smoke',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Safari'],
            },
            testMatch: unauthenticatedNoSmoke,
        },
    ],

    globalSetup: './tests/config/global-setup.ts',

    testIgnore: ['**/tests-manual/**', '**/e2e/admin/**'],
});
