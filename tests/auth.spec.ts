import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

const uuid = randomUUID();

test('register', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Registrase' }).click();
  await page.getByRole('textbox', { name: 'Nombre de Usuario' }).click();
  await page.getByRole('textbox', { name: 'Nombre de Usuario' }).fill('usernametest1' + uuid);
  await page.getByRole('textbox', { name: 'Correo Electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo Electrónico' }).fill(`useremail1${uuid}@useremail.com`);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).click();
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill('12345678');
  await page.getByRole('textbox', { name: 'Confirmar Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Confirmar Contraseña' }).fill('12345678');
  await page.getByRole('button', { name: 'Registrarse' }).click();
  await page.waitForURL('http://localhost:3000/dashboard/home', { timeout: 10000 });
  const cookies = await page.context().cookies();
  expect(cookies.some(cookie => cookie.name === 'session_id')).toBe(true);
  const welcomeMessage = await page.getByTestId('welcome-message').textContent();
  expect(welcomeMessage).toBe(`Welcome usernametest1${uuid}`);
  await page.close();
});

test('login', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByTestId('email-input').click();
  await page.getByTestId('email-input').fill(`useremail1${uuid}@useremail.com`);
  await page.getByTestId('password-input').click();
  await page.getByTestId('password-input').fill('12345678');
  await page.getByTestId('login-button').click();
  await page.waitForURL('http://localhost:3000/dashboard/home', { timeout: 10000 });
  const cookies = await page.context().cookies();
  expect(cookies.some(cookie => cookie.name === 'session_id')).toBe(true);
  const welcomeMessage = await page.getByTestId('welcome-message').textContent();
  expect(welcomeMessage).toBe(`Welcome usernametest1${uuid}`);
  await page.close();
});

test('logout', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByTestId('email-input').click();
  await page.getByTestId('email-input').fill(`useremail1${uuid}@useremail.com`);
  await page.getByTestId('password-input').click();
  await page.getByTestId('password-input').fill('12345678');
  await page.getByTestId('login-button').click();
  const welcomeMessage = await page.getByTestId('welcome-message').textContent();
  expect(welcomeMessage).toBe(`Welcome usernametest1${uuid}`);
  const cookies1 = await page.context().cookies();
  expect(cookies1.some(cookie => cookie.name === 'session_id')).toBe(true);
  await page.getByTestId('dropdown-menu-trigger').click();
  await page.getByTestId('logout-button').click();
  await page.waitForURL('http://localhost:3000/');
  const cookies2 = await page.context().cookies();
  expect(cookies2.some(cookie => cookie.name === 'session_id')).toBe(false);
  await page.close();
});
