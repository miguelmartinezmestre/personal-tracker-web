import { test, expect } from '../../fixtures/test-base';
import { expectErrorAlert } from '../../helpers/assertions';
import { DEFAULT_PASSWORD, loginUser, logoutUser } from '../../helpers/test-helpers';

test.describe('Account settings', () => {
    test(
        'renames the profile and changes the password',
        { tag: ['@REQ-AUTENTICACION-004'] },
        async ({ page, testUser }) => {
            await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
            const nameInput = page.getByTestId('settings-name-input');
            await expect(nameInput).toHaveValue(testUser.username, { timeout: 15000 });

            await nameInput.fill('   ');
            await page.getByTestId('settings-profile-save').click();
            await expect(nameInput).toHaveAttribute('aria-invalid', 'true');

            await nameInput.fill('Renamed user');
            await page.getByTestId('settings-profile-save').click();
            await expect(nameInput).toHaveAttribute('aria-invalid', 'false');
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('welcome-message')).toContainText('Renamed user', {
                timeout: 15000,
            });

            const newPassword = 'Changed123';
            await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('settings-currentPassword-input').fill(DEFAULT_PASSWORD);
            await page.getByTestId('settings-newPassword-input').fill(newPassword);
            await page.getByTestId('settings-confirmPassword-input').fill(newPassword);
            await page.getByTestId('settings-password-save').click();
            await expect(page.getByTestId('settings-currentPassword-input')).toHaveValue('', {
                timeout: 15000,
            });

            await logoutUser(page);
            await loginUser(page, testUser.email, newPassword);
        }
    );

    test(
        'deletes the account after confirming the email and password',
        { tag: ['@REQ-AUTENTICACION-009', '@INH-AUT-16'] },
        async ({ page, testUser }) => {
            await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
            const button = page.getByTestId('delete-account-button');
            await expect(button).toBeDisabled({ timeout: 15000 });

            await page.getByTestId('delete-account-email-input').fill(testUser.email);
            await page.getByTestId('delete-account-password-input').fill(DEFAULT_PASSWORD);
            await button.click();
            await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15000 });

            await page.getByTestId('email-input').fill(testUser.email);
            await page.getByTestId('password-input').fill(DEFAULT_PASSWORD);
            await page.getByTestId('login-button').click();
            await expectErrorAlert(page);
            await expect(page).toHaveURL(/\/login(\?|$)/);
        }
    );
});
