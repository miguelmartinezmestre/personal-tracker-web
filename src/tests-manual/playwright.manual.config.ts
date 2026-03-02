import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration for manual/documentation tests.
 * These tests are not meant to run in CI - they generate screenshots
 * for TFG thesis documentation.
 *
 * Run with: pnpm test:e2e:manual
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  timeout: 180000, // 3 minutes for full walkthrough
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'off',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalSetup: '../tests/global-setup.ts',
});
