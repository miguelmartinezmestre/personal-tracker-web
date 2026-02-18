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
import { LoginPage } from '../../pages';

test.describe('Login', () => {
    test('login with valid credentials', async ({ page }) => {
        const loginPage = new LoginPage(page);

        // Create user first
        const { email, username } = await createTestUser(page);

        // Logout
        await logoutUser(page);

        // Login again
        await loginPage.goto();
        await loginPage.login(email, DEFAULT_PASSWORD);

        // Verify on dashboard
        await expectOnDashboard(page);
        await expectWelcomeMessage(page, username);
    });

    test('login with invalid password', async ({ page }) => {
        const loginPage = new LoginPage(page);

        // Create user first
        const { email } = await createTestUser(page);

        // Logout
        await logoutUser(page);

        // Try to login with wrong password
        await loginPage.goto();
        await loginPage.login(email, 'wrongpassword123');

        // Should stay on login page
        await expectOnLogin(page);

        // Should show error
        await expectErrorAlert(page);
    });

    test('login with non-existent email', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const fakeUser = UserFactory.create();

        await loginPage.goto();
        await loginPage.login(fakeUser.email, fakeUser.password);

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
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        // Click "Don't have an account" link
        await loginPage.clickRegisterLink();

        // Should be on register page
        await page.waitForURL(/\/register$/);
        await expect(page).toHaveURL(/\/register$/);
    });

    test('redirect to forgot password link works', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        // Click forgot password link
        await loginPage.clickForgotPasswordLink();

        // Should be on forgot password page
        await page.waitForURL(/\/forget-password$/);
        await expect(page).toHaveURL(/\/forget-password$/);
    });

    test('form validates email format', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        // Enter invalid email
        await loginPage.login('invalid-email', DEFAULT_PASSWORD);

        // Should show validation error or stay on page
        await expectOnLogin(page);
    });

    test('form validates empty fields', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        // Try to submit empty form
        await loginPage.loginButton.click();

        // Should stay on login page (validation prevents submission)
        await expectOnLogin(page);
    });
});
