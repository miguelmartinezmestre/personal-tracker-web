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

test('forgot password: submit does not show validation error for valid email', async ({ page }) => {
    const { email } = await createTestUser(page);

    await page.goto('/forget-password');
    await page.getByTestId('email-input').fill(email);
    await page.getByRole('button', { name: /send|enviar|reset/i }).click();

    // Wait for the API response
    await page.waitForTimeout(2000);

    // The test passes if no validation error is shown for the email field
    // (the actual success message may not appear if email sending is not configured)
    const emailInput = page.getByTestId('email-input');

    // Check that the email input doesn't have aria-invalid="true" (validation passed)
    const ariaInvalid = await emailInput.getAttribute('aria-invalid');
    expect(ariaInvalid).not.toBe('true');

    // Also verify no destructive error alert is visible
    const errorAlert = page.locator('[data-variant="destructive"]');
    const hasError = await errorAlert.isVisible().catch(() => false);
    expect(hasError).toBe(false);
});

test('forgot password: invalid email shows validation', async ({ page }) => {
    await page.goto('/forget-password');
    await page.getByTestId('email-input').fill('invalid-email');
    await page.getByRole('button', { name: /send|enviar|reset/i }).click();

    // Form validation should show error (not a success/error alert, but field validation)
    await expect(page.getByTestId('email-input')).toHaveAttribute('aria-invalid', 'true');
    // The form shows validation message via FormMessage component
    const validationMessage = page.locator('[data-testid="email-input"] ~ div, [role="alert"]');
    await expect(validationMessage).toBeVisible();
});
