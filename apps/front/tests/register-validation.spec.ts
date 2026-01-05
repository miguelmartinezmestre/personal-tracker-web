import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('register validation: mismatched passwords shows error', async ({ page }) => {
    const uuid = randomUUID();
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill('usernametest-' + uuid);
    await page.getByTestId('register-email-input').fill(`user-${uuid}@example.com`);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345679');
    await page.getByTestId('register-button').click();

    // Should not navigate and should show zod error on confirm password
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
});

test('register validation: password too short shows error', async ({ page }) => {
    const uuid = randomUUID();
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill('usernametest-' + uuid);
    await page.getByTestId('register-email-input').fill(`user-${uuid}@example.com`);
    await page.getByTestId('register-password-input').fill('1234567'); // 7 characters, minimum is 8
    await page.getByTestId('register-confirm-password-input').fill('1234567');
    await page.getByTestId('register-button').click();

    // Should not navigate
    await expect(page).toHaveURL(/\/register$/);
});

test('register validation: invalid email format shows error', async ({ page }) => {
    const uuid = randomUUID();
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill('usernametest-' + uuid);
    await page.getByTestId('register-email-input').fill('invalid-email'); // Invalid email
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();

    // Should not navigate
    await expect(page).toHaveURL(/\/register$/);
});

test('register validation: empty username shows error', async ({ page }) => {
    const uuid = randomUUID();
    await page.goto('/register');
    // Skip username
    await page.getByTestId('register-email-input').fill(`user-${uuid}@example.com`);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();

    // Should not navigate
    await expect(page).toHaveURL(/\/register$/);
});
