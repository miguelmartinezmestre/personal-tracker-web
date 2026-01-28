import { defineConfig, devices } from '@playwright/test';

const isCollectingCoverage = process.env.PLAYWRIGHT_COVERAGE === 'true';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 2,

    // Reduced timeouts for faster execution
    timeout: 60000, // 1 minute max per test
    expect: {
        timeout: 10000, // 10s for assertions
    },

    reporter: isCollectingCoverage
        ? [
              ['list'],
              [
                  'monocart-reporter',
                  {
                      name: 'Playwright Coverage Report',
                      outputFile: './coverage/playwright/report.html',
                      coverage: {
                          entryFilter: (entry: { url: string }) => {
                              return (
                                  entry.url.includes('localhost:3000') &&
                                  !entry.url.includes('node_modules')
                              );
                          },
                          sourceFilter: (sourcePath: string) => {
                              return (
                                  sourcePath.includes('/src/') &&
                                  !sourcePath.includes('node_modules')
                              );
                          },
                          reports: ['v8', 'html', 'lcov', 'console-details'],
                          lcov: true,
                      },
                  },
              ],
          ]
        : process.env.CI
          ? [['list'], ['html', { open: 'never' }]]
          : 'html',

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'retain-on-failure', // Only keep traces for failures
        screenshot: 'only-on-failure', // Screenshots only on failure
        video: 'off', // No video recording

        // Faster navigation
        navigationTimeout: 15000,
        actionTimeout: 10000,
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
    globalSetup: './tests/global-setup.ts',

    // Ignore manual tests
    testIgnore: ['**/tests-manual/**'],
});
