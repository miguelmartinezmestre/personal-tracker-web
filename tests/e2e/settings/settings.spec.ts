import { test, expect } from '../../fixtures/test-base';
import { SettingsPage } from '../../pages/settings.page';
import { loginUser, logoutUser } from '../../helpers/test-helpers';
import { expectErrorAlert } from '../../helpers/assertions';

test.describe('Settings', () => {
    test(
        'account tab persists username changes',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();
            await settings.switchToAccount();

            await expect(settings.usernameInput).toHaveValue(isolatedTestUser.username, {
                timeout: 10000,
            });
            await expect(settings.emailInput).toHaveValue(isolatedTestUser.email, {
                timeout: 10000,
            });

            const newName = `Updated User ${Date.now()}`;
            await settings.usernameInput.fill(newName);
            await settings.accountSaveButton.click();

            await expect(settings.accountSuccessMessage).toBeVisible({ timeout: 15000 });

            await settings.goto();
            await settings.switchToAccount();
            await expect(settings.usernameInput).toHaveValue(newName, { timeout: 10000 });
        }
    );

    test(
        'password tab accepts a valid password change',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();
            await settings.switchToPassword();

            const newPassword = 'Newpassword123';
            await settings.fillPasswordForm(isolatedTestUser.password, newPassword, newPassword);
            await settings.passwordSaveButton.click();

            await expect(settings.passwordSuccessMessage).toBeVisible({ timeout: 10000 });

            await logoutUser(isolatedAuthenticatedPage);
            await isolatedAuthenticatedPage.getByTestId('email-input').fill(isolatedTestUser.email);
            await isolatedAuthenticatedPage
                .getByTestId('password-input')
                .fill(isolatedTestUser.password);
            await isolatedAuthenticatedPage.getByTestId('login-button').click();

            await expect(isolatedAuthenticatedPage).toHaveURL(/\/login(\?|$)/);
            await expectErrorAlert(isolatedAuthenticatedPage);

            await loginUser(isolatedAuthenticatedPage, isolatedTestUser.email, newPassword);
            await expect(isolatedAuthenticatedPage).toHaveURL(/\/dashboard\/home(\?|$)/);
        }
    );

    test(
        'password tab rejects a wrong current password',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();
            await settings.switchToPassword();

            await settings.fillPasswordForm('wrongpassword', 'Newpassword123', 'Newpassword123');
            await settings.passwordSaveButton.click();

            await expect(settings.passwordErrorMessage).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'password tab rejects mismatched and weak new passwords before submission',
        { tag: ['@REQ-AUTENTICACION-004', '@REQ-NF-006', '@security'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();
            await settings.switchToPassword();

            await settings.fillPasswordForm(isolatedTestUser.password, 'weakpass', 'Different123');
            await settings.passwordSaveButton.click();

            await expect(settings.newPasswordInput).toHaveAttribute('aria-invalid', 'true');
            await expect(settings.confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
            const validationMessages = isolatedAuthenticatedPage.locator(
                '[data-slot="form-message"]'
            );
            await expect(
                validationMessages.filter({ hasText: /mayúscula|uppercase/i }).first()
            ).toBeVisible();
            await expect(
                validationMessages.filter({ hasText: /no coinciden|do not match/i }).first()
            ).toBeVisible();
            await expect(settings.passwordSuccessMessage).toHaveCount(0);
        }
    );

    test(
        'danger zone rejects an incorrect password and keeps the session active',
        { tag: ['@REQ-AUTENTICACION-009', '@security'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();
            await settings.switchToDanger();

            await settings.fillDeleteAccountForm(isolatedTestUser.email, 'WrongPassword123');
            await settings.deleteAccountButton.click();

            await expect(settings.deleteAccountError).toBeVisible({ timeout: 10000 });

            await isolatedAuthenticatedPage.goto('/dashboard/home');
            await expect(isolatedAuthenticatedPage).toHaveURL(/\/dashboard\/home(\?|$)/);
        }
    );

    test(
        'danger zone deletes the account and leaves the dashboard',
        { tag: ['@REQ-AUTENTICACION-009'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();
            await settings.switchToDanger();

            await expect(settings.deleteAccountButton).toBeDisabled();
            await settings.fillDeleteAccountForm(isolatedTestUser.email, isolatedTestUser.password);
            await expect(settings.deleteAccountButton).toBeEnabled();
            await settings.deleteAccountButton.click();

            await expect(isolatedAuthenticatedPage).toHaveURL(/\/login(\?|$)/, {
                timeout: 15000,
            });

            await isolatedAuthenticatedPage.goto('/dashboard/home');
            await expect(isolatedAuthenticatedPage).toHaveURL(/\/login(\?|$)/, {
                timeout: 15000,
            });

            await isolatedAuthenticatedPage.getByTestId('email-input').fill(isolatedTestUser.email);
            await isolatedAuthenticatedPage
                .getByTestId('password-input')
                .fill(isolatedTestUser.password);
            await isolatedAuthenticatedPage.getByTestId('login-button').click();
            await expect(isolatedAuthenticatedPage).toHaveURL(/\/login(\?|$)/);
            await expectErrorAlert(isolatedAuthenticatedPage);
        }
    );
});
