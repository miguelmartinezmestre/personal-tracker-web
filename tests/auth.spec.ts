import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('register new user', async ({ page }) => {
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
  const welcomeMessage = await page.getByTestId('welcome-message').textContent();
  expect(welcomeMessage).toContain(username);
});

test('login with existing user', async ({ page }) => {
  // First register a user
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

  // Logout by clearing session (since logout UI is not available)
  await page.context().clearCookies();
  await page.goto('/login');

  // Now login
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
