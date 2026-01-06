import { test, expect } from '@playwright/test';

test('reset password: redirects when missing key', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/$/);
});

test('reset password: renders form with key param', async ({ page }) => {
    await page.goto('/reset-password?key=test-key');

    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/password|contrase/i)).toBeVisible();
    await expect(page.getByLabel(/confirm|confirmar/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset|restablecer/i })).toBeVisible();
});

test('reset password: invalid token shows error', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');

    await page.getByLabel(/password|contrase/i).fill('newpassword123');
    await page.getByLabel(/confirm|confirmar/i).fill('newpassword123');
    await page.getByRole('button', { name: /reset|restablecer/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
});
