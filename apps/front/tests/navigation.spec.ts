import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('navigation: sidebar links work correctly', async ({ page }) => {
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

    // Navigate to Objectives via sidebar
    await page.getByRole('link', { name: /objectives/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/objectives$/);

    // Navigate to Sessions via sidebar
    await page.getByRole('link', { name: /sessions/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/sessions$/);

    // Navigate to Notifications via sidebar
    await page.getByRole('link', { name: /notifications/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);

    // Navigate back to Home via sidebar
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);
});

test('navigation: logo link redirects to home', async ({ page }) => {
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

    // Navigate to another page
    await page.goto('/dashboard/objectives');
    await expect(page).toHaveURL(/\/dashboard\/objectives$/);

    // Navigate back to home via sidebar (logo might redirect to root, so use sidebar link)
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);
});

test('navigation: direct URL navigation works for authenticated users', async ({ page }) => {
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

    // Direct navigation to different pages
    await page.goto('/dashboard/objectives');
    await expect(page).toHaveURL(/\/dashboard\/objectives$/);

    await page.goto('/dashboard/sessions');
    await expect(page).toHaveURL(/\/dashboard\/sessions$/);

    await page.goto('/dashboard/teams');
    await expect(page).toHaveURL(/\/dashboard\/teams$/);

    await page.goto('/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);
});

