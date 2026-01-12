import { test, expect } from '@playwright/test';
import { takeScreenshot } from './test-helpers';

test('landing page: displays main content and navigation links', async ({ page }) => {
    await page.goto('/');
    await takeScreenshot(page, 'landing-page-main-content', 'full-page');

    // Verify main heading (h1)
    await expect(
        page.getByRole('heading', { name: /achieve your goals\. control your progress/i })
    ).toBeVisible();

    // Verify description text
    await expect(page.getByText(/define, control and visualize/i)).toBeVisible();

    // Verify navigation links
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
    // Use first() to avoid strict mode violation (there are 2 Login links)
    await expect(page.getByRole('link', { name: /login/i }).first()).toBeVisible();

    // Verify logo/brand link
    await expect(page.getByRole('link', { name: /metricas/i }).first()).toBeVisible();
});

test('landing page: Get Started link navigates to register', async ({ page }) => {
    await page.goto('/');
    await takeScreenshot(page, 'landing-page-get-started', 'landing-page');
    const link = page.getByRole('link', { name: /get started/i }).first();

    // Wait for navigation using Promise.all to handle client-side routing
    await Promise.all([page.waitForURL(/\/register$/, { timeout: 15000 }), link.click()]);

    // Wait for the register page to be fully loaded
    await expect(page).toHaveURL(/\/register$/);
    await takeScreenshot(page, 'landing-page-get-started', 'register-page');
});

test('landing page: Login link navigates to login', async ({ page }) => {
    await page.goto('/');
    await takeScreenshot(page, 'landing-page-login', 'landing-page');
    // Use first() to avoid strict mode violation (there are 2 Login links)
    const link = page.getByRole('link', { name: /login/i }).first();

    // Wait for navigation using Promise.all to handle client-side routing
    await Promise.all([page.waitForURL(/\/login$/, { timeout: 15000 }), link.click()]);

    // Wait for the login page to be fully loaded by checking for login form
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
    await takeScreenshot(page, 'landing-page-login', 'login-page');
});

test('landing page: displays features section', async ({ page }) => {
    await page.goto('/');

    // Verify features heading
    await expect(
        page.getByRole('heading', { name: /achieve your goals with our system/i })
    ).toBeVisible();

    // Verify some feature items are visible
    await expect(page.getByText(/customizable goals/i)).toBeVisible();
    await expect(page.getByText(/visual progress panel/i)).toBeVisible();

    // Screenshot: Features section
    await takeScreenshot(page, 'landing-page-features', 'features-section');
});
