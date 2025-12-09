import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('notifications: page loads and displays notifications heading', async ({ page }) => {
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

    // Navigate to Notifications
    await page.goto('/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);

    // Verify page heading is visible
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
});

test('notifications: accessible from sidebar navigation', async ({ page }) => {
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

    // Navigate to Notifications via sidebar
    await page.getByRole('link', { name: /notifications/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
});

