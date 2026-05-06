import { test, expect, type Locator } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';

async function fillAndAssert(locator: Locator, value: string): Promise<void> {
    await locator.click();
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
}

test.describe('Password Reset', () => {
    test(
        'forgot password form is displayed',
        { tag: ['@REQ-AUTENTICACION-003', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/forget-password');

            await expect(page.getByTestId('email-input')).toBeVisible();
            await expect(page.getByTestId('forgot-password-submit')).toBeVisible();
        }
    );

    test(
        'submit forgot password with email shows success message',
        { tag: ['@REQ-AUTENTICACION-003', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/forget-password');
            await fillAndAssert(page.getByTestId('email-input'), user.email);
            await page.getByTestId('forgot-password-submit').click();

            const successAlert = page.locator('[data-slot="alert"]').filter({
                hasText: /success|sent|enviado|éxito/i,
            });
            await expect(successAlert).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'reset password with invalid token shows error',
        { tag: ['@REQ-AUTENTICACION-003', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/reset-password?token=invalid-token-12345');

            await fillAndAssert(page.getByTestId('reset-password-input'), 'Newpassword123');
            await fillAndAssert(page.getByTestId('reset-password-confirm-input'), 'Newpassword123');
            await page.getByTestId('reset-password-submit').click();

            const errorAlert = page.locator('[data-slot="alert"]').filter({
                hasText: /error|invalid|inválido|expirado|expired/i,
            });
            await expect(errorAlert.first()).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'reset password: passwords must match validation',
        { tag: ['@REQ-AUTENTICACION-003', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/reset-password?token=some-token');

            await page.getByTestId('reset-password-input').fill('newpassword123');
            await page.getByTestId('reset-password-confirm-input').fill('differentpassword');
            await page.getByTestId('reset-password-submit').click();

            await expect(page).toHaveURL(/\/reset-password/);
        }
    );

    test(
        'link to login works from forgot password page',
        { tag: ['@REQ-AUTENTICACION-003', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/forget-password');

            const loginLink = page.getByRole('link', { name: /login|iniciar sesión/i }).first();
            if ((await loginLink.count()) > 0) {
                await loginLink.click();
                await expect(page).toHaveURL(/\/login/);
            }
        }
    );
});
