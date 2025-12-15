import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

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
    await createTestUser(page);

    // Verify we can access the page
    await expect(page.getByTestId('welcome-message')).toBeVisible();
});
