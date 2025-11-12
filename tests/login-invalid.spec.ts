import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('login invalid credentials shows error and stays on login', async ({ page }) => {
    const uuid = randomUUID();
    await page.goto('/login');
    await page.getByTestId('email-input').fill(`nouser-${uuid}@example.com`);
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Error')).toBeVisible();
});


