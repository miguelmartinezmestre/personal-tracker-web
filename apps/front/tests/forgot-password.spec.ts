import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

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

test('forgot password: submit shows success message', async ({ page }) => {
    const { email } = await createTestUser(page);

    await page.goto('/forget-password');
    await page.getByTestId('email-input').fill(email);
    await page.getByRole('button', { name: /send|enviar|reset/i }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/reset|link|correo|email/i);
});

test('forgot password: invalid email shows validation', async ({ page }) => {
    await page.goto('/forget-password');
    await page.getByTestId('email-input').fill('invalid-email');
    await page.getByRole('button', { name: /send|enviar|reset/i }).click();

    await expect(page.getByTestId('email-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
});
