import { defineConfig, devices } from '@playwright/test';

const chromeProjectUse = {
    ...devices['Desktop Chrome'],
    launchOptions: {
        args: ['--disable-animations'],
    },
};

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    workers: 1,

    timeout: 180_000,
    expect: {
        timeout: 5000,
    },

    retries: 0,
    maxFailures: process.env.CI ? undefined : 1,

    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',

        testIdAttribute: 'data-testid',

        navigationTimeout: 45000,
        actionTimeout: 30000,

        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'setup',
            testMatch: /.*auth\.stack\.setup\.ts/,
            timeout: 60_000,
            use: chromeProjectUse,
        },
        {
            name: 'authenticated',
            dependencies: ['setup'],
            use: chromeProjectUse,
            testMatch: ['**/e2e/**'],
            testIgnore: ['**/e2e/auth/**', '**/e2e/security/**'],
        },
        {
            name: 'auth',
            dependencies: ['setup'],
            use: chromeProjectUse,
            testMatch: ['**/e2e/auth/**', '**/e2e/security/**'],
        },
    ],

    testIgnore: ['**/manual/**'],
});
