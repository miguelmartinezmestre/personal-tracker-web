import { test, expect } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';
import { expectOnDashboard, expectOnLogin, expectErrorAlert } from '../../helpers/assertions';

test.describe('User Registration', () => {
    test(
        'successful registration with email/password',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            // Should navigate to dashboard after successful registration
            await page.waitForURL(/\/dashboard/, { timeout: 30000 });
            await expectOnDashboard(page);
        }
    );

    test(
        'validation: username is required',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            // Leave username empty
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            // Should show validation error and stay on register page
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: email must be valid',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill('not-an-email');
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            // Should stay on register page due to validation
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: password must be at least 8 characters',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill('short');
            await page.getByTestId('register-confirm-password-input').fill('short');
            await page.getByTestId('register-button').click();

            // Should stay on register page
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: weak password is rejected',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill('12345678');
            await page.getByTestId('register-confirm-password-input').fill('12345678');
            await page.getByTestId('register-button').click();

            // Should stay on register page due to strong password policy
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: passwords must match',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill('password123');
            await page.getByTestId('register-confirm-password-input').fill('differentpassword');
            await page.getByTestId('register-button').click();

            // Should stay on register page
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'duplicate email shows error',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            // Register user first time
            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();
            await page.waitForURL(/\/dashboard/, { timeout: 30000 });

            // Clear cookies and try to register with same email
            await page.context().clearCookies();
            await page.goto('/register');

            const secondUser = UserFactory.create({ email: user.email });
            await page.getByTestId('register-username-input').fill(secondUser.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill(secondUser.password);
            await page.getByTestId('register-confirm-password-input').fill(secondUser.password);
            await page.getByTestId('register-button').click();

            // Should show error
            await expectErrorAlert(page);
        }
    );

    test(
        'after registration navigates to dashboard',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            await page.waitForURL(/\/dashboard\/home/, { timeout: 30000 });
            await expect(page).toHaveURL(/\/dashboard\/home$/);
        }
    );

    test(
        'link to login page works',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-018'] },
        async ({ page }) => {
            await page.goto('/register');

            const loginLink = page.getByRole('link', { name: /already have|ya tienes/i });
            await expect(loginLink).toBeVisible();
            await loginLink.click();

            await expectOnLogin(page);
        }
    );
});
