import { expect, test } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';
import { createTestUser, logoutUser, loginUser } from '../../helpers/test-helpers';
import { waitForPasswordResetUrl } from '../../helpers/email-verification';

test.describe('Password Reset', () => {
    test(
        'resets through MailHog, accepts the new password and rejects the previous one',
        { tag: ['@REQ-AUTENTICACION-003', '@cross-browser-critical'] },
        async ({ page }) => {
            const user = await createTestUser(page);
            await logoutUser(page);
            const requestedAt = Date.now();
            await page.goto('/forget-password');
            await page.getByTestId('email-input').fill(user.email);
            await page.getByTestId('forgot-password-submit').click();
            const resetUrl = await waitForPasswordResetUrl(page, user.email, requestedAt);
            await page.goto(resetUrl);
            const newPassword = 'Replaced-Password-54321';
            await page.getByTestId('reset-password-input').fill(newPassword);
            await page.getByTestId('reset-password-confirm-input').fill(newPassword);
            await page.getByTestId('reset-password-submit').click();
            await expect(page).toHaveURL(/\/login\?passwordReset=success/);
            await loginUser(page, user.email, newPassword);
            await logoutUser(page);
            await page.getByTestId('email-input').fill(user.email);
            await page.getByTestId('password-input').fill(user.password);
            await page.getByTestId('login-button').click();
            await expect(page.getByRole('alert')).toBeVisible();
            await expect(page).toHaveURL(/\/login/);
        }
    );
    test(
        'forgot password request shows a neutral success response',
        { tag: ['@REQ-AUTENTICACION-003'] },
        async ({ page }) => {
            const user = UserFactory.create();
            await page.goto('/forget-password');
            await page.getByTestId('email-input').fill(user.email);
            await page.getByTestId('forgot-password-submit').click();

            await expect(
                page.locator('[data-slot="alert"]').filter({
                    hasText: /success|sent|enviado|éxito/i,
                })
            ).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'reset password rejects an invalid token',
        { tag: ['@REQ-AUTENTICACION-003'] },
        async ({ page }) => {
            await page.goto('/reset-password?token=invalid-token-12345');
            await page.getByTestId('reset-password-input').fill('Newpassword123');
            await page.getByTestId('reset-password-confirm-input').fill('Newpassword123');
            await page.getByTestId('reset-password-submit').click();

            await expect(
                page.locator('[data-slot="alert"]').filter({
                    hasText: /error|invalid|inválido|expirado|expired/i,
                })
            ).toBeVisible({ timeout: 10000 });
        }
    );
});
