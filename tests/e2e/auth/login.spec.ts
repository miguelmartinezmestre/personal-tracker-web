import { test } from '@playwright/test';
import { createTestUser, loginUser, logoutUser } from '../../helpers/test-helpers';
import { expectOnDashboard, expectOnLogin, expectErrorAlert } from '../../helpers/assertions';

test.describe('Login', () => {
    test(
        'successful login lands on the dashboard',
        { tag: ['@REQ-AUTENTICACION-001'] },
        async ({ page }) => {
            const user = await createTestUser(page);
            await logoutUser(page);
            await loginUser(page, user.email, user.password);
            await expectOnDashboard(page);
        }
    );

    test(
        'invalid credentials stay on login with an error',
        { tag: ['@REQ-AUTENTICACION-001'] },
        async ({ page }) => {
            await page.goto('/login', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('email-input').fill('nobody@example.com');
            await page.getByTestId('password-input').fill('WrongPassword123!');
            await page.getByTestId('login-button').click();
            await expectOnLogin(page);
            await expectErrorAlert(page);
        }
    );
});
