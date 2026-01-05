import { test, expect } from '@playwright/test';

test('forgot password: link is visible on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot your password/i })).toBeVisible();
});

test('forgot password: clicking link navigates to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot your password/i }).click();
    await expect(page).toHaveURL(/\/forget-password$/);
});

test('forgot password: form has email input', async ({ page }) => {
    await page.goto('/forget-password');
    await expect(page.getByTestId('email-input')).toBeVisible();
});
