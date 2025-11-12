import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

const uuid = randomUUID();

test('objectives end-to-end: register, validate, create, progress, edit, delete', async ({ page }) => {
    // Register a new user directly via route
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill('usernametest1' + uuid);
    await page.getByTestId('register-email-input').fill(`useremail1${uuid}@useremail.com`);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();

    await expect(page).toHaveURL(/\/dashboard\/home$/);
    const welcomeMessage = await page.getByTestId('welcome-message').textContent();
    expect(welcomeMessage).toBe(`Welcome usernametest1${uuid}`);

    // Go to Objectives
    await page.goto('/dashboard/objectives');

    // Open create modal and validate required fields
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText('Title is required')).toBeVisible();

    // Fill form and create objective
    const originalTitle = `testobjectivename-${uuid}`;
    await page.getByTestId('objective-title-input').fill(originalTitle);
    await page.getByTestId('objective-description-input').fill('testobjectivedescription');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('eur');
    await page.getByTestId('objective-current-input').fill('1');
    // Leave deadline and status as default to reduce flakiness
    await page.getByTestId('objective-save-button').click();

    // Verify the new objective appears in the list
    await expect(page.getByText(originalTitle)).toBeVisible();

    // Verify go to progress link works (scoped to the created row)
    let row = page.locator('tr', { hasText: originalTitle }).first();
    await row.getByTestId('objective-progress-link').click();
    await expect(page).toHaveURL(/\/dashboard\/objectives\//);
    await page.goBack();

    // Edit the objective (scoped to the created row)
    row = page.locator('tr', { hasText: originalTitle }).first();
    await row.getByTestId('objective-edit-open').click();
    const editedTitle = `edited-${uuid}`;
    await page.getByTestId('objective-edit-title-input').fill(editedTitle);
    await page.getByTestId('objective-edit-save-button').click();
    await expect(page.getByText(editedTitle)).toBeVisible();

    // Delete the objective (scoped to the edited row)
    row = page.locator('tr', { hasText: editedTitle }).first();
    await row.getByTestId('objective-delete-button').click();
    await expect(page.getByText(editedTitle)).not.toBeVisible();

    await page.close();
});


