import { test, expect } from '@playwright/test';

test('debug: check if pages load properly', async ({ page }) => {
    // Test register page loads
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByTestId('register-username-input')).toBeVisible();
    await expect(page.getByTestId('register-email-input')).toBeVisible();
    await expect(page.getByTestId('register-password-input')).toBeVisible();
    await expect(page.getByTestId('register-confirm-password-input')).toBeVisible();
    await expect(page.getByTestId('register-button')).toBeVisible();

    // Test login page loads
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-button')).toBeVisible();

    // Test dashboard home redirects to login (client-side redirect)
    await page.goto('/dashboard/home');
    // Wait for client-side redirect to happen
    await page.waitForURL(/\/login$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
});
