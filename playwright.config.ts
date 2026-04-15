import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 2,

    timeout: 90000,
    expect: {
        timeout: 5000,
    },

    retries: 0,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        testIdAttribute: 'data-testid',

        navigationTimeout: 45000,
        actionTimeout: 15000,
    },

    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
        },
        {
            name: 'authenticated',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/regular-user.json',
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: [
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
            ],
        },
        {
            name: 'auth-and-smoke',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: ['**/e2e/auth/**', '**/smoke/**'],
        },
        {
            name: 'admin',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/admin-user.json',
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: ['**/e2e/admin/**'],
        },
    ],

    globalSetup: './tests/config/global-setup.ts',

    testIgnore: ['**/tests-manual/**'],
});
