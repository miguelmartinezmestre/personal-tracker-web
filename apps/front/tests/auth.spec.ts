import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('register new user', async ({ page }) => {
    const { username } = await createTestUser(page);
    const welcomeMessage = await page.getByTestId('welcome-message').textContent();
    expect(welcomeMessage).toContain(username);
});

test('login with existing user', async ({ page }) => {
    // First register a user
    const { email, username } = await createTestUser(page);

    // Logout by clearing session (since logout UI is not available)
    await page.context().clearCookies();

    // Now login
    await page.goto('/login');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill('12345678');
    await page.getByTestId('login-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    const welcomeMessage = await page.getByTestId('welcome-message').textContent();
    expect(welcomeMessage).toContain(username);
});

test('register redirects to login link works', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /already have an account/i }).click();
    await expect(page).toHaveURL(/\/login$/);
});

test('login redirects to register link works', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /don't have an account/i }).click();
    await expect(page).toHaveURL(/\/register$/);
});

test.skip('logout', async ({ page }) => {
    // Logout UI is not available yet; enable once implemented.
});
