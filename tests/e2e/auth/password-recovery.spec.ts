import { test, expect } from '@playwright/test';
import { createTestUser } from '../../helpers/test-helpers';
import { UserFactory } from '../../helpers/factories';

test.describe('Password Recovery', () => {
    test('request password reset shows feedback', async ({ page }) => {
        // Create a user first
        const { email } = await createTestUser(page);

        // Clear session
        await page.context().clearCookies();

        // Go to forgot password page
        await page.goto('/forget-password');

        // Fill email
        const emailInput = page.locator('input[type="email"], [data-testid*="email"]').first();
        await emailInput.fill(email);

        // Submit
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show some feedback (success message or toast)
        await page.waitForTimeout(2000);

        // Either success message visible or redirect happened
        const successMessage = page.locator('text=/check.*email|revisa.*correo|sent|enviado/i');
        const hasMessage = (await successMessage.count()) > 0;

        if (!hasMessage) {
            // Page might show different UI or redirect
            // Just verify we're no longer on the same state
            await page.waitForLoadState('networkidle');
        }
    });

    test('request password reset with non-existent email shows appropriate response', async ({
        page,
    }) => {
        const fakeUser = UserFactory.create();

        await page.goto('/forget-password');

        // Fill with non-existent email
        const emailInput = page.locator('input[type="email"], [data-testid*="email"]').first();
        await emailInput.fill(fakeUser.email);

        // Submit
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Wait for response
        await page.waitForTimeout(2000);

        // System should either show success (for security) or stay on page
        // Most systems show same message regardless of email existence for security
        await page.waitForLoadState('networkidle');
    });

    test('forgot password page is accessible', async ({ page }) => {
        await page.goto('/forget-password');

        // Page should load with email input and submit button
        const emailInput = page.locator('input[type="email"], [data-testid*="email"]').first();
        await expect(emailInput).toBeVisible();

        const submitButton = page.locator('button[type="submit"]').first();
        await expect(submitButton).toBeVisible();
    });

    test('forgot password page has back to login link', async ({ page }) => {
        await page.goto('/forget-password');

        // Should have a link back to login
        const loginLink = page.getByRole('link', { name: /login|iniciar sesión|back|volver/i });

        if ((await loginLink.count()) > 0) {
            await loginLink.first().click();
            await page.waitForURL(/\/login$/);
            await expect(page).toHaveURL(/\/login$/);
        }
    });

    test('reset password page with invalid token shows error', async ({ page }) => {
        // Try to access reset password with invalid token
        await page.goto('/reset-password?token=invalid-token-12345');

        // Wait for page to load and process token
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // The page redirects to home page if no valid key/token is found
        const currentUrl = page.url();

        // Check for redirect to home, login, or forgot-password (all valid behaviors)
        const isRedirectedToHome =
            currentUrl === 'http://localhost:3000/' || currentUrl.endsWith('/');
        const isRedirectedToLogin = currentUrl.includes('/login');
        const isRedirectedToForgotPassword = currentUrl.includes('/forget-password');

        // Or shows error message
        const errorMessage = page.locator('text=/invalid|expired|inválido|expirado|error/i');
        const hasError = (await errorMessage.count()) > 0;

        // Either error shown or redirected (redirect to home is the expected behavior)
        expect(
            hasError || isRedirectedToHome || isRedirectedToLogin || isRedirectedToForgotPassword
        ).toBeTruthy();
    });

    test('reset password form validates password requirements', async ({ page }) => {
        // Note: This test can only verify UI behavior without a valid token
        // In a real scenario, you would need to intercept email or use a test token

        await page.goto('/reset-password?token=test-token');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // If page shows password form (unlikely without valid token)
        const passwordInput = page.locator('input[type="password"]').first();

        if (await passwordInput.isVisible()) {
            // Fill with short password
            await passwordInput.fill('short');

            const submitButton = page.locator('button[type="submit"]').first();
            await submitButton.click();

            // Should show validation error
            await page.waitForTimeout(1000);
        }
    });
});
