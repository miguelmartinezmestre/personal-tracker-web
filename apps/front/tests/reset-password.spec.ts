import { test, expect } from '@playwright/test';

test('reset password: redirects when missing key', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/$/);
});

test('reset password: renders form with key param', async ({ page }) => {
    await page.goto('/reset-password?key=test-key');

    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible();
});
