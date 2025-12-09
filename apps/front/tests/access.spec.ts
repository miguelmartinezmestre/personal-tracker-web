import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('redirects unauthenticated users from dashboard home to login', async ({ page }) => {
    await page.goto('/dashboard/home');
    await expect(page).toHaveURL(/\/login$/);
});

test('redirects unauthenticated users from dashboard objectives to login', async ({ page }) => {
    await page.goto('/dashboard/objectives');
    await expect(page).toHaveURL(/\/login$/);
});

test('redirects unauthenticated users from dashboard sessions to login', async ({ page }) => {
    await page.goto('/dashboard/sessions');
    await expect(page).toHaveURL(/\/login$/);
});

test('redirects unauthenticated users from dashboard teams to login', async ({ page }) => {
    await page.goto('/dashboard/teams');
    await expect(page).toHaveURL(/\/login$/);
});

test('redirects unauthenticated users from dashboard notifications to login', async ({ page }) => {
    await page.goto('/dashboard/notifications');
    await expect(page).toHaveURL(/\/login$/);
});

test('redirects unauthenticated users from dashboard admin panel to login', async ({ page }) => {
    await page.goto('/dashboard/admin-panel');
    await expect(page).toHaveURL(/\/login$/);
});

test('allows authenticated users to access dashboard home', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);
    
    // Verify we can access the page
    await expect(page.getByTestId('welcome-message')).toBeVisible();
});


