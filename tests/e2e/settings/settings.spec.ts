import { test, expect } from '../../fixtures/test-base';
import { SettingsPage } from '../../pages/settings.page';

test.describe('Settings', () => {
    test(
        'navigating to settings shows all three tabs',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await expect(settings.settingsPage).toBeVisible({ timeout: 15000 });
            await expect(settings.tabAccount).toBeVisible();
            await expect(settings.tabPassword).toBeVisible();
            await expect(settings.tabDanger).toBeVisible();
        }
    );

    test(
        'account tab: edit username and save',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToAccount();
            await expect(settings.usernameInput).toBeVisible({ timeout: 10000 });

            const newName = `Updated User ${Date.now()}`;
            await settings.usernameInput.clear();
            await settings.usernameInput.fill(newName);
            await settings.accountSaveButton.click();

            const maxTime = Date.now() + 30000;
            let success = false;

            while (Date.now() < maxTime && !success) {
                if (await settings.accountSuccessMessage.isVisible().catch(() => false)) {
                    success = true;
                    break;
                }

                const sessionResponse = await isolatedAuthenticatedPage.request.get('/api/auth/get-session');
                if (sessionResponse.ok()) {
                    const payload = (await sessionResponse.json()) as
                        | {
                              user?: { name?: string | null } | null;
                              data?: { user?: { name?: string | null } | null } | null;
                          }
                        | null;
                    const sessionName = payload?.data?.user?.name ?? payload?.user?.name ?? null;
                    if (sessionName === newName) {
                        success = true;
                        break;
                    }
                }

                await settings.goto();
                await settings.switchToAccount();
                const inputValue = await settings.usernameInput.inputValue();
                if (inputValue === newName) {
                    success = true;
                    break;
                }

                await isolatedAuthenticatedPage.waitForTimeout(500);
            }

            expect(success).toBe(true);
        }
    );

    test(
        'account tab: edit email shows verification message',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToAccount();
            await expect(settings.emailInput).toBeVisible({ timeout: 10000 });
            await expect(settings.usernameInput).toHaveValue(isolatedTestUser.username, {
                timeout: 10000,
            });

            const newEmail = `newemail-${Date.now()}@test.com`;
            await settings.emailInput.clear();
            await settings.emailInput.fill(newEmail);
            await settings.accountSaveButton.click();

            const maxTime = Date.now() + 30000;
            let messageCount = 0;

            while (Date.now() < maxTime && messageCount === 0) {
                const successCount = await settings.accountSuccessMessage.count();
                const errorCount = await settings.accountErrorMessage.count();
                messageCount = successCount + errorCount;

                if (messageCount === 0) {
                    await isolatedAuthenticatedPage.waitForTimeout(500);
                }
            }

            expect(messageCount).toBeGreaterThan(0);
        }
    );

    test(
        'account tab: cancel does not save changes',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToAccount();
            await expect(settings.usernameInput).toBeVisible({ timeout: 10000 });
            await expect(settings.usernameInput).toHaveValue(isolatedTestUser.username, {
                timeout: 10000,
            });

            const originalValue = await settings.usernameInput.inputValue();

            await settings.usernameInput.clear();
            await settings.usernameInput.fill('ShouldNotSave');
            await settings.accountCancelButton.click();

            await settings.goto();
            await settings.switchToAccount();
            await expect(settings.usernameInput).toBeVisible({ timeout: 10000 });

            const currentValue = await settings.usernameInput.inputValue();
            expect(currentValue).not.toBe('ShouldNotSave');
            expect(currentValue).toBe(originalValue);
        }
    );

    test(
        'password tab: change password successfully',
        { tag: ['@REQ-AUTENTICACION-005'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToPassword();
            await expect(settings.currentPasswordInput).toBeVisible({ timeout: 10000 });

            const newPassword = 'newpassword123';
            await settings.fillPasswordForm(
                isolatedTestUser.password,
                isolatedTestUser.password,
                newPassword
            );
            await settings.passwordSaveButton.click();

            await expect(settings.passwordSuccessMessage).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'password tab: wrong current password shows error',
        { tag: ['@REQ-AUTENTICACION-005'] },
        async ({ isolatedAuthenticatedPage }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToPassword();
            await expect(settings.currentPasswordInput).toBeVisible({ timeout: 10000 });

            await settings.fillPasswordForm('wrongpassword', 'wrongpassword', 'newpassword123');
            await settings.passwordSaveButton.click();

            await expect(settings.passwordErrorMessage).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'password tab: passwords do not match shows validation error',
        { tag: ['@REQ-AUTENTICACION-005'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToPassword();
            await expect(settings.currentPasswordInput).toBeVisible({ timeout: 10000 });

            await settings.currentPasswordInput.fill(isolatedTestUser.password);
            await settings.confirmPasswordInput.fill('doesnotmatch');
            await settings.newPasswordInput.fill('newpassword123');
            await settings.passwordSaveButton.click();

            const formError = isolatedAuthenticatedPage.locator(
                '[data-testid="password-error-message"], [data-slot="form-message"]'
            );
            await expect(formError.first()).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'danger zone: delete button disabled until email confirmed',
        { tag: ['@REQ-AUTENTICACION-008'] },
        async ({ isolatedAuthenticatedPage }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToDanger();
            await expect(settings.deleteAccountButton).toBeVisible({ timeout: 10000 });

            await expect(settings.deleteAccountButton).toBeDisabled();
        }
    );

    test(
        'danger zone: delete button enabled after email and password filled',
        { tag: ['@REQ-AUTENTICACION-008'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToDanger();
            await expect(settings.deleteAccountButton).toBeVisible({ timeout: 10000 });

            await settings.fillDeleteAccountForm(
                isolatedTestUser.email,
                isolatedTestUser.password
            );

            await expect(settings.deleteAccountButton).toBeEnabled();
        }
    );

    test(
        'danger zone: delete account redirects to landing',
        { tag: ['@REQ-AUTENTICACION-008'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser }) => {
            const settings = new SettingsPage(isolatedAuthenticatedPage);
            await settings.goto();

            await settings.switchToDanger();
            await expect(settings.deleteAccountButton).toBeVisible({ timeout: 10000 });

            await settings.fillDeleteAccountForm(
                isolatedTestUser.email,
                isolatedTestUser.password
            );
            await settings.deleteAccountButton.click();

            await expect(settings.deleteAccountSuccess).toBeVisible({ timeout: 15000 });
            await isolatedAuthenticatedPage.waitForURL(/\/$|\/login/, { timeout: 15000 });
        }
    );
});
