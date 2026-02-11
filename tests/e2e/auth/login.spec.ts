import { test, expect } from '@playwright/test';
import {
    createTestUser,
    loginUser,
    logoutUser,
    DEFAULT_PASSWORD,
} from '../../helpers/test-helpers';
import { UserFactory } from '../../helpers/factories';
import {
    expectOnDashboard,
    expectOnLogin,
    expectErrorAlert,
    expectWelcomeMessage,
} from '../../helpers/assertions';

test.describe('Login', () => {
    test('login with valid credentials', async ({ page }) => {
        // Create user first
        const { email, username } = await createTestUser(page);

        // Logout
        await logoutUser(page);

        // Login again
        await loginUser(page, email);

        // Verify on dashboard
        await expectOnDashboard(page);
        await expectWelcomeMessage(page, username);
    });

    test('login with invalid password', async ({ page }) => {
        // Create user first
        const { email } = await createTestUser(page);

        // Logout
        await logoutUser(page);

        // Try to login with wrong password
        await page.goto('/login');
        await page.getByTestId('email-input').fill(email);
        await page.getByTestId('password-input').fill('wrongpassword123');
        await page.getByTestId('login-button').click();

        // Should stay on login page
        await expectOnLogin(page);

        // Should show error
        await expectErrorAlert(page);
    });

    test('login with non-existent email', async ({ page }) => {
        const fakeUser = UserFactory.create();

        await page.goto('/login');
        await page.getByTestId('email-input').fill(fakeUser.email);
        await page.getByTestId('password-input').fill(fakeUser.password);
        await page.getByTestId('login-button').click();

        // Should stay on login page
        await expectOnLogin(page);

        // Should show error
        await expectErrorAlert(page);
    });

    test('remember session after page reload', async ({ page }) => {
        // Create and login user
        const { username } = await createTestUser(page);

        // Verify on dashboard
        await expectOnDashboard(page);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be on dashboard
        await expectOnDashboard(page);
        await expectWelcomeMessage(page, username);
    });

    test('logout clears session', async ({ page }) => {
        // Create user
        await createTestUser(page);
        await expectOnDashboard(page);

        // Logout (clear cookies)
        await logoutUser(page);

        // Try to access protected page
        await page.goto('/dashboard/home');

        // Should redirect to login
        await expectOnLogin(page);
    });

    test('redirect to register link works', async ({ page }) => {
        await page.goto('/login');

        // Click "Don't have an account" link
        const registerLink = page.getByRole('link', {
            name: /don't have an account|no tienes cuenta/i,
        });
        await registerLink.click();

        // Should be on register page
        await page.waitForURL(/\/register$/);
        await expect(page).toHaveURL(/\/register$/);
    });

    test('redirect to forgot password link works', async ({ page }) => {
        await page.goto('/login');

        // Click forgot password link
        const forgotLink = page.getByRole('link', { name: /forgot|olvidaste/i });
        await forgotLink.click();

        // Should be on forgot password page
        await page.waitForURL(/\/forget-password$/);
        await expect(page).toHaveURL(/\/forget-password$/);
    });

    test('form validates email format', async ({ page }) => {
        await page.goto('/login');

        // Enter invalid email
        await page.getByTestId('email-input').fill('invalid-email');
        await page.getByTestId('password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('login-button').click();

        // Should show validation error or stay on page
        await expectOnLogin(page);
    });

    test('form validates empty fields', async ({ page }) => {
        await page.goto('/login');

        // Try to submit empty form
        await page.getByTestId('login-button').click();

        // Should stay on login page (validation prevents submission)
        await expectOnLogin(page);
    });
});
