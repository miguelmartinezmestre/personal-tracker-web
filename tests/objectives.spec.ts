import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';



const uuid = randomUUID();

test('create objective', async ({ page }) => {

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

    await page.getByRole('link', { name: 'Objectives' }).click();
    await page.getByRole('button', { name: 'Create New Objective' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('testobjectivename');
    await page.getByRole('textbox', { name: 'Description' }).click();
    await page.getByRole('textbox', { name: 'Description' }).fill('testobjectivedescription');
    await page.getByRole('combobox', { name: 'Category' }).click();
    await page.getByLabel('Personal').getByText('Personal').click();
    await page.getByRole('spinbutton', { name: 'Target Value' }).click();
    await page.getByRole('spinbutton', { name: 'Target Value' }).fill('10');
    await page.getByRole('textbox', { name: 'Unit' }).click();
    await page.getByRole('textbox', { name: 'Unit' }).fill('eur');
    await page.getByRole('spinbutton', { name: 'Current Value' }).click();
    await page.getByRole('spinbutton', { name: 'Current Value' }).fill('1');
    await page.getByRole('button', { name: 'Deadline' }).click();
    await page.getByRole('gridcell', { name: '26' }).click();
    await page.getByRole('button', { name: 'Deadline' }).click();
    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByLabel('In Progress').getByText('In Progress').click();
    await page.getByRole('button', { name: 'Save Objective' }).click();
    await page.getByRole('cell', { name: 'testobjectivename' }).click();
    await page.close();
});

// test('edit objective', async ({ page }) => {
    

//     await page.goto('http://localhost:3000/');
//   await page.getByRole('link', { name: 'Iniciar sesión' }).click();
//   await page.getByTestId('email-input').click();
//   await page.getByTestId('email-input').press('ControlOrMeta+a');
//   await page.getByTestId('email-input').fill('aaa@aaa.com');
//   await page.getByTestId('password-input').click();
//   await page.getByTestId('password-input').press('ControlOrMeta+a');
//   await page.getByTestId('password-input').fill('aaa@aaa.com');
//   await page.getByTestId('login-button').click();
//   await page.getByRole('link', { name: 'Objectives' }).click();
//   await page.getByRole('button', { name: 'Create New Objective' }).click();
//   await page.locator('.data-\\[state\\=open\\]\\:animate-in').first().click();
//   await page.getByRole('textbox', { name: 'Title' }).press('ArrowRight');
//   await page.getByRole('textbox', { name: 'Title' }).fill('testobjectivename2');
//   await page.getByRole('button', { name: 'Save Objective' }).click();
//   await page.getByRole('cell', { name: 'testobjectivename2' }).click();
//   await page.getByRole('cell', { name: 'testobjectivename2' }).click();
// });
