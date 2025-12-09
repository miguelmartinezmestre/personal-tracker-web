import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('sessions: page loads and displays sessions table', async ({ page }) => {
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

    // Navigate to Sessions
    await page.goto('/dashboard/sessions');
    await expect(page).toHaveURL(/\/dashboard\/sessions$/);

    // Verify page title is visible
    await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();

    // Verify sessions table is present (it may be empty)
    await expect(page.getByTestId('table')).toBeVisible();
});

test('sessions: accessible from sidebar navigation', async ({ page }) => {
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

    // Navigate to Sessions via sidebar
    await page.getByRole('link', { name: /sessions/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/sessions$/);
    await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible();
});

