import { test, expect } from '@playwright/test';

test('landing page: displays main content and navigation links', async ({ page }) => {
    await page.goto('/');

    // Verify main heading (h1)
    await expect(page.getByRole('heading', { name: /achieve your goals\. control your progress/i })).toBeVisible();

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
    await page.getByRole('link', { name: /get started/i }).click();
    await expect(page).toHaveURL(/\/register$/);
});

test('landing page: Login link navigates to login', async ({ page }) => {
    await page.goto('/');
    // Use first() to avoid strict mode violation (there are 2 Login links)
    await page.getByRole('link', { name: /login/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);
});

test('landing page: displays features section', async ({ page }) => {
    await page.goto('/');

    // Verify features heading
    await expect(page.getByRole('heading', { name: /achieve your goals with our system/i })).toBeVisible();

    // Verify some feature items are visible
    await expect(page.getByText(/customizable goals/i)).toBeVisible();
    await expect(page.getByText(/visual progress panel/i)).toBeVisible();
});

