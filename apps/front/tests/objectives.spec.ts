import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { takeScreenshot } from './test-helpers';

test('objectives end-to-end: register, validate, create, progress, edit, delete', async ({ page }) => {
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    // Register a new user
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();

    await expect(page).toHaveURL(/\/dashboard\/home$/);
    const welcomeMessage = await page.getByTestId('welcome-message').textContent();
    expect(welcomeMessage).toContain(username);

    // Go to Objectives
    await page.goto('/dashboard/objectives');
    await takeScreenshot(page, 'objectives-end-to-end', 'objectives-list-initial');

    // Open create modal and validate required fields
    await page.getByTestId('objective-create-open').click();
    await takeScreenshot(page, 'objectives-end-to-end', 'create-modal-opened');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText('Title is required')).toBeVisible();
    await takeScreenshot(page, 'objectives-end-to-end', 'validation-error-title-required');

    // Test cancel button
    await page.getByTestId('objective-cancel-button').click();
    await expect(page.getByTestId('objective-create-open')).toBeVisible();

    // Reopen modal and fill form to create objective
    await page.getByTestId('objective-create-open').click();
    const originalTitle = `testobjectivename-${uuid}`;
    await page.getByTestId('objective-title-input').fill(originalTitle);
    await page.getByTestId('objective-description-input').fill('testobjectivedescription');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('eur');
    await page.getByTestId('objective-current-input').fill('1');
    
    // Screenshot: Form filled before saving
    await takeScreenshot(page, 'objectives-end-to-end', 'create-form-filled');
    
    // Leave deadline and status as default to reduce flakiness
    await page.getByTestId('objective-save-button').click();

    // Verify the new objective appears in the list
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'objectives-end-to-end', 'objective-created-in-list');

    // Verify go to progress link works (scoped to the created row)
    let row = page.locator('tr', { hasText: originalTitle }).first();
    await row.getByTestId('objective-progress-link').click();
    await expect(page).toHaveURL(/\/dashboard\/objectives\//);
    await page.goBack();

    // Wait for the page to load
    await expect(page.getByText(originalTitle)).toBeVisible();

    // Edit the objective (scoped to the created row)
    row = page.locator('tr', { hasText: originalTitle }).first();
    await row.getByTestId('objective-edit-open').click();
    await takeScreenshot(page, 'objectives-end-to-end', 'edit-modal-opened');
    const editedTitle = `edited-${uuid}`;
    await page.getByTestId('objective-edit-title-input').clear();
    await page.getByTestId('objective-edit-title-input').fill(editedTitle);
    await takeScreenshot(page, 'objectives-end-to-end', 'edit-form-filled');
    await page.getByTestId('objective-edit-save-button').click();
    await expect(page.getByText(editedTitle)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'objectives-end-to-end', 'objective-edited-in-list');

    // Delete the objective (scoped to the edited row)
    row = page.locator('tr', { hasText: editedTitle }).first();
    await row.getByTestId('objective-delete-button').click();
    await expect(page.getByText(editedTitle)).not.toBeVisible({ timeout: 5000 });
});

test('objectives: validation for required fields', async ({ page }) => {
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    // Register and login
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Go to Objectives
    await page.goto('/dashboard/objectives');

    // Try to create objective without title
    await page.getByTestId('objective-create-open').click();
    await takeScreenshot(page, 'objectives-validation', 'empty-form');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText('Title is required')).toBeVisible();
    await takeScreenshot(page, 'objectives-validation', 'validation-error-displayed');
});


