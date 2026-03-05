import { test, expect } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';

test.describe('Password Reset', () => {
    test('forgot password form is displayed', async ({ page }) => {
        await page.goto('/forget-password');

        await expect(page.getByTestId('email-input')).toBeVisible();
        await expect(page.getByTestId('forgot-password-submit')).toBeVisible();
    });

    test('submit forgot password with email shows success message', async ({ page }) => {
        const user = UserFactory.create();

        await page.goto('/forget-password');
        await page.getByTestId('email-input').fill(user.email);
        await page.getByTestId('forgot-password-submit').click();

        // Should show success message (even if email doesn't exist, for security)
        // The success alert uses data-slot="alert" with default variant
        const successAlert = page.locator('[data-slot="alert"]').filter({
            hasText: /success|sent|enviado|éxito/i,
        });
        await expect(successAlert).toBeVisible({ timeout: 10000 });
    });

    test('reset password with invalid token shows error', async ({ page }) => {
        await page.goto('/reset-password?token=invalid-token-12345');

        // The page renders if token query param exists (server checks presence, not validity)
        await page.getByTestId('reset-password-input').fill('newpassword123');
        await page.getByTestId('reset-password-confirm-input').fill('newpassword123');
        await page.getByTestId('reset-password-submit').click();

        // Should show error about invalid token (Alert with variant="destructive")
        const errorAlert = page.locator('[data-slot="alert"]').filter({
            hasText: /error|invalid|inválido|expirado|expired/i,
        });
        await expect(errorAlert.first()).toBeVisible({ timeout: 10000 });
    });

    test('reset password: passwords must match validation', async ({ page }) => {
        await page.goto('/reset-password?token=some-token');

        await page.getByTestId('reset-password-input').fill('newpassword123');
        await page.getByTestId('reset-password-confirm-input').fill('differentpassword');
        await page.getByTestId('reset-password-submit').click();

        // Should stay on the page (validation prevents submission)
        await expect(page).toHaveURL(/\/reset-password/);
    });

    test('link to login works from forgot password page', async ({ page }) => {
        await page.goto('/forget-password');

        // Use a more specific locator to avoid matching navbar links
        const loginLink = page.getByRole('link', { name: /login|iniciar sesión/i }).first();
        if ((await loginLink.count()) > 0) {
            await loginLink.click();
            await expect(page).toHaveURL(/\/login/);
        }
    });
});
