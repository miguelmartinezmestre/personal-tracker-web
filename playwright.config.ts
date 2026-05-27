import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 1,

    timeout: 90000,
    expect: {
        timeout: 5000,
    },

    retries: 3,

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        testIdAttribute: 'data-testid',

        navigationTimeout: 45000,
        actionTimeout: 15000,
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
            name: 'authenticated',
            dependencies: ['setup'],
            workers: 1,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: ['**/e2e/**'],
            testIgnore: ['**/e2e/auth/**', '**/e2e/admin/**', '**/e2e/security/**'],
        },
        {
            name: 'auth-and-smoke',
            dependencies: ['setup'],
            workers: 1,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: ['**/e2e/auth/**', '**/e2e/security/**', '**/smoke/**'],
        },
        {
            name: 'admin',
            dependencies: ['setup'],
            workers: 1,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-animations'],
                },
            },
            testMatch: ['**/e2e/admin/**'],
        },
    ],

    globalSetup: './tests/config/global-setup.ts',

    testIgnore: ['**/manual/**'],
});
