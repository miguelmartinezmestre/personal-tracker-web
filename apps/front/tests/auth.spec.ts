import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test('register new user', async ({ page }) => {
    // Screenshot: Landing page before registration
    await page.goto('/');
    await takeScreenshot(page, 'register-new-user', 'landing-page');

    // Screenshot: Registration form
    await page.goto('/register');
    await takeScreenshot(page, 'register-new-user', 'registration-form');

    const { username } = await createTestUser(page);

    // Screenshot: Dashboard after successful registration
    await takeScreenshot(page, 'register-new-user', 'dashboard-after-registration');

    const welcomeMessage = await page.getByTestId('welcome-message').textContent();
    expect(welcomeMessage).toContain(username);
});

test('login with existing user', async ({ page }) => {
    // First register a user
    const { email, username } = await createTestUser(page);

    // Logout by clearing session (since logout UI is not available)
    await page.context().clearCookies();

    // Screenshot: Login form
    await page.goto('/login');
    await takeScreenshot(page, 'login-with-existing-user', 'login-form');

    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill('12345678');

    // Screenshot: Login form filled
    await takeScreenshot(page, 'login-with-existing-user', 'login-form-filled');

    await page.getByTestId('login-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Screenshot: Dashboard after login
    await takeScreenshot(page, 'login-with-existing-user', 'dashboard-after-login');

    const welcomeMessage = await page.getByTestId('welcome-message').textContent();
    expect(welcomeMessage).toContain(username);
});

test('register redirects to login link works', async ({ page }) => {
    await page.goto('/register');
    await takeScreenshot(page, 'register-redirects-to-login', 'register-page');
    await page.getByRole('link', { name: /already have an account/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await takeScreenshot(page, 'register-redirects-to-login', 'login-page-after-redirect');
});

test('login redirects to register link works', async ({ page }) => {
    await page.goto('/login');
    await takeScreenshot(page, 'login-redirects-to-register', 'login-page');
    await page.getByRole('link', { name: /don't have an account/i }).click();
    await expect(page).toHaveURL(/\/register$/);
    await takeScreenshot(page, 'login-redirects-to-register', 'register-page-after-redirect');
});

test.skip('logout', async () => {
    // Logout UI is not available yet; enable once implemented.
});
