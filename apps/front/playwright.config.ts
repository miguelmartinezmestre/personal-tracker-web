import { defineConfig, devices } from '@playwright/test';

const isCollectingCoverage = process.env.PLAYWRIGHT_COVERAGE === 'true';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    // retries: 2,
    workers: 4,
    reporter: isCollectingCoverage
        ? [
              ['list'], // Show test progress in console
              [
                  'monocart-reporter',
                  {
                      name: 'Playwright Coverage Report',
                      outputFile: './coverage/playwright/report.html',
                      coverage: {
                          entryFilter: (entry: { url: string }) => {
                              // Only collect coverage for app source files
                              return (
                                  entry.url.includes('localhost:3000') &&
                                  !entry.url.includes('node_modules')
                              );
                          },
                          sourceFilter: (sourcePath: string) => {
                              // Include only src files
                              return (
                                  sourcePath.includes('/src/') &&
                                  !sourcePath.includes('node_modules')
                              );
                          },
                          reports: ['v8', 'html', 'lcov', 'console-details'], // 'console-details' shows coverage summary in console
                          lcov: true,
                      },
                  },
              ],
          ]
        : 'html',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        // Screenshots always for documentation purposes
        // screenshot: 'on',
        // Increase timeout for authentication flows
        // actionTimeout: 10000,
        // navigationTimeout: 10000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Global setup to ensure backend is ready
    globalSetup: './tests/global-setup.ts',
});
