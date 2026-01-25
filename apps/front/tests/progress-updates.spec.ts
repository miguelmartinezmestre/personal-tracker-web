import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { takeScreenshot, ensureDefaultCategories } from './test-helpers';

test('progress updates: create, edit, delete progress entry', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;
    const shortId = uuid.substring(0, 8);
    const organizationSlug = `org-${shortId}`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-organization-slug-input').fill(organizationSlug);
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Ensure categories exist before creating objective
    await ensureDefaultCategories(page);

    // Create an objective first
    await page.goto('/dashboard/objectives');
    const objectiveTitle = `testobjective-${uuid}`;
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objectiveTitle);
    await page.getByTestId('objective-description-input').fill('Test objective');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(objectiveTitle)).toBeVisible();

    // Navigate to objective detail page
    const objectiveRow = page.locator('tr', { hasText: objectiveTitle }).first();
    await objectiveRow.getByTestId('objective-progress-link').click();
    await expect(page).toHaveURL(/\/dashboard\/objectives\/[^/]+$/);
    await takeScreenshot(page, 'progress-updates-create', 'objective-detail-page');

    // Create progress update
    await expect(page.getByTestId('progress-create-open')).toBeVisible();
    await page.getByTestId('progress-create-open').click();
    await expect(page.getByTestId('progress-value-input')).toBeVisible();
    await takeScreenshot(page, 'progress-updates-create', 'create-modal-opened');
    await page.getByTestId('progress-value-input').fill('5');
    await page.getByTestId('progress-comment-input').fill('Test progress comment');
    await takeScreenshot(page, 'progress-updates-create', 'form-filled');
    await page.getByTestId('progress-save-button').click();

    // Verify progress update appears in table
    // Use locator with td context and first() to avoid strict mode violations
    await expect(page.locator('td', { hasText: '5' }).first()).toBeVisible();
    await expect(page.getByText('Test progress comment')).toBeVisible();
    await takeScreenshot(page, 'progress-updates-create', 'progress-created-in-table');

    // Edit progress update
    const progressRow = page.locator('tr', { hasText: '5' }).first();
    await progressRow.getByTestId('progress-edit-open').click();
    await takeScreenshot(page, 'progress-updates-create', 'edit-modal-opened');
    await page.getByTestId('progress-edit-value-input').clear();
    await page.getByTestId('progress-edit-value-input').fill('7');
    await page.getByTestId('progress-edit-comment-input').clear();
    await page.getByTestId('progress-edit-comment-input').fill('Updated comment');
    await takeScreenshot(page, 'progress-updates-create', 'edit-form-filled');
    await page.getByTestId('progress-edit-save-button').click();

    // Verify updated progress
    await expect(page.locator('td', { hasText: '7' }).first()).toBeVisible();
    await expect(page.locator('td', { hasText: 'Updated comment' }).first()).toBeVisible();
    await takeScreenshot(page, 'progress-updates-create', 'progress-updated-in-table');

    // Delete progress update
    const updatedRow = page.locator('tr', { hasText: 'Updated comment' }).first();
    await updatedRow.getByTestId('progress-delete-button').click();
    const deleteDialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: /delete|eliminar/i }).click();
    await expect(deleteDialog).toBeHidden({ timeout: 10000 });
    await expect(page.locator('td', { hasText: 'Updated comment' })).not.toBeVisible({
        timeout: 10000,
    });
});

test('progress updates: validation for required fields', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;
    const shortId = uuid.substring(0, 8);
    const organizationSlug = `org-${shortId}`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-organization-slug-input').fill(organizationSlug);
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Ensure categories exist before creating objective
    await ensureDefaultCategories(page);

    // Create an objective
    await page.goto('/dashboard/objectives');
    const objectiveTitle = `testobjective-${uuid}`;
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objectiveTitle);
    await page.getByTestId('objective-description-input').fill('Test objective');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(objectiveTitle)).toBeVisible();

    // Navigate to objective detail page
    const objectiveRow = page.locator('tr', { hasText: objectiveTitle }).first();
    await objectiveRow.getByTestId('objective-progress-link').click();
    await expect(page).toHaveURL(/\/dashboard\/objectives\/[^/]+$/);

    // Try to create progress with invalid values
    await expect(page.getByTestId('progress-create-open')).toBeVisible();
    await page.getByTestId('progress-create-open').click();
    await expect(page.getByTestId('progress-value-input')).toBeVisible();
    await takeScreenshot(page, 'progress-updates-validation', 'empty-form');
    await page.getByTestId('progress-value-input').fill('-5');
    await page.getByTestId('progress-save-button').click();

    // Should show validation error for negative values
    await expect(page.getByText(/updated value must be greater than 0/i)).toBeVisible();

    await page.getByTestId('progress-value-input').fill('0');
    await page.getByTestId('progress-save-button').click();
    await expect(page.getByText(/updated value must be greater than 0/i)).toBeVisible();
    await takeScreenshot(page, 'progress-updates-validation', 'validation-error-displayed');
});
