import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

const uuid = randomUUID();

test('register', async ({ page }) => {
  await page.goto('/register');
  await page.getByTestId('register-username-input').fill('usernametest1' + uuid);
  await page.getByTestId('register-email-input').fill(`useremail1${uuid}@useremail.com`);
  await page.getByTestId('register-password-input').fill('12345678');
  await page.getByTestId('register-confirm-password-input').fill('12345678');
  await page.getByTestId('register-button').click();

  await expect(page).toHaveURL(/\/dashboard\/home$/);
  const welcomeMessage = await page.getByTestId('welcome-message').textContent();
  expect(welcomeMessage).toBe(`Welcome usernametest1${uuid}`);
  await page.close();
});

test('login', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(`useremail1${uuid}@useremail.com`);
  await page.getByTestId('password-input').fill('12345678');
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL(/\/dashboard\/home$/);
  const welcomeMessage = await page.getByTestId('welcome-message').textContent();
  expect(welcomeMessage).toBe(`Welcome usernametest1${uuid}`);
  await page.close();
});

test.skip('logout', async ({ page }) => {
  // Logout UI is not available yet; enable once implemented.
});
