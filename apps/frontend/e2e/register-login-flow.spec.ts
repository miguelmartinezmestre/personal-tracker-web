import { test, expect } from '@playwright/test';

test('register and login', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByRole('link', { name: 'Registrase' }).click();
    await page.getByRole('textbox', { name: 'Nombre de Usuario' }).click();
    await page.getByRole('textbox', { name: 'Nombre de Usuario' }).fill('test');
    await page.getByRole('textbox', { name: 'Correo Electrónico' }).fill('test');
    await page.getByRole('textbox', { name: 'Correo Electrónico' }).fill('test3@test.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('12345678');
    await page.getByRole('button', { name: 'Registrarse' }).click();
    await page.getByTestId('email-input').click();
    await page.getByTestId('email-input').fill('test@test.com');
    await page.getByTestId('email-input').press('Tab');
    await page.getByTestId('password-input').fill('12345678');
    await page.getByTestId('login-button').click();
});
