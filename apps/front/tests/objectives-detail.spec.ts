import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { takeScreenshot } from './test-helpers';

test('objectives: navigate to objective detail page and verify content', async ({ page }) => {
    // Register a new user
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

    // Go to Objectives and create an objective
    await page.goto('/dashboard/objectives');
    const objectiveTitle = `testobjective-${uuid}`;
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objectiveTitle);
    await page.getByTestId('objective-description-input').fill('Test objective description');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('eur');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(objectiveTitle)).toBeVisible();

    // Screenshot: Objective created in list
    await takeScreenshot(page, 'objectives-detail', 'objective-created-in-list', uuid);

    // Navigate to objective detail
    const objectiveRow = page.locator('tr', { hasText: objectiveTitle }).first();
    await objectiveRow.getByTestId('objective-progress-link').click();
    // Should navigate to objective detail page
    await expect(page).toHaveURL(/\/dashboard\/objectives\/[^/]+$/);

    // Verify the page loaded correctly by checking for the heading
    await expect(
        page.getByRole('heading', { name: /objective progress|progreso del objetivo/i })
    ).toBeVisible({
        timeout: 10000,
    });

    // Screenshot: Objective detail page
    await takeScreenshot(page, 'objectives-detail', 'detail-page', uuid);
});
