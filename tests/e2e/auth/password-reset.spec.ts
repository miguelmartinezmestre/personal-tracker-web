import { expect, test } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';

test.describe('Password Reset', () => {
    test('forgot password request shows a neutral success response', async ({ page }) => {
        const user = UserFactory.create();
        await page.goto('/forget-password');
        await page.getByTestId('email-input').fill(user.email);
        await page.getByTestId('forgot-password-submit').click();

        await expect(
            page.locator('[data-slot="alert"]').filter({
                hasText: /success|sent|enviado|éxito/i,
            })
        ).toBeVisible({ timeout: 10000 });
    });

    test('reset password rejects an invalid token', async ({ page }) => {
        await page.goto('/reset-password?token=invalid-token-12345');
        await page.getByTestId('reset-password-input').fill('Newpassword123');
        await page.getByTestId('reset-password-confirm-input').fill('Newpassword123');
        await page.getByTestId('reset-password-submit').click();

        await expect(
            page.locator('[data-slot="alert"]').filter({
                hasText: /error|invalid|inválido|expirado|expired/i,
            })
        ).toBeVisible({ timeout: 10000 });
    });
});
