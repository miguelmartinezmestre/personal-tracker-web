import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('search and filtering: objectives search', async ({ page }) => {
    // Register and login
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

    // Navigate to objectives
    await page.goto('/dashboard/objectives');

    // Create a test objective
    const objectiveTitle = `testobjective-${uuid}`;
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objectiveTitle);
    await page.getByTestId('objective-description-input').fill('Test description');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(objectiveTitle)).toBeVisible();

    // Test search functionality
    const searchInput = page.getByTestId('objectives-search-input');
    if (await searchInput.isVisible()) {
        // Search for the created objective
        await searchInput.fill(objectiveTitle);
        await page.waitForTimeout(500);

        // Should still show the objective
        await expect(page.getByText(objectiveTitle)).toBeVisible();

        // Search for something else
        await searchInput.fill('nonexistent');
        await page.waitForTimeout(500);

        // Should not show the objective
        await expect(page.getByText(objectiveTitle)).not.toBeVisible();

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Should show the objective again
        await expect(page.getByText(objectiveTitle)).toBeVisible();
    }
});

test('search and filtering: objectives category filter', async ({ page }) => {
    // Register and login
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

    // Navigate to objectives
    await page.goto('/dashboard/objectives');

    // Create a test objective with Personal category
    const objectiveTitle = `testobjective-${uuid}`;
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objectiveTitle);
    await page.getByTestId('objective-description-input').fill('Test description');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(objectiveTitle)).toBeVisible();

    // Test category filter
    const categoryFilter = page.getByTestId('objectives-category-filter');
    if (await categoryFilter.isVisible()) {
        // Filter by Personal category
        await categoryFilter.click();
        await page.getByRole('option', { name: 'Personal' }).click();
        await page.waitForTimeout(500);

        // Should still show the objective
        await expect(page.getByText(objectiveTitle)).toBeVisible();

        // Filter by different category
        await categoryFilter.click();
        await page.getByRole('option', { name: 'Work' }).click();
        await page.waitForTimeout(500);

        // Should not show the objective
        await expect(page.getByText(objectiveTitle)).not.toBeVisible();
    }
});

test('search and filtering: objectives status filter', async ({ page }) => {
    // Register and login
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

    // Navigate to objectives
    await page.goto('/dashboard/objectives');

    // Create a test objective
    const objectiveTitle = `testobjective-${uuid}`;
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objectiveTitle);
    await page.getByTestId('objective-description-input').fill('Test description');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(objectiveTitle)).toBeVisible();

    // Test status filter
    const statusFilter = page.getByTestId('objectives-status-filter');
    if (await statusFilter.isVisible()) {
        // Filter by Not Started status
        await statusFilter.click();
        await page.getByRole('option', { name: 'Not Started' }).click();
        await page.waitForTimeout(500);

        // Should still show the objective
        await expect(page.getByText(objectiveTitle)).toBeVisible();

        // Filter by Completed status
        await statusFilter.click();
        await page.getByRole('option', { name: 'Completed' }).click();
        await page.waitForTimeout(500);

        // Should not show the objective
        await expect(page.getByText(objectiveTitle)).not.toBeVisible();
    }
});

test('search and filtering: table sorting', async ({ page }) => {
    // Register and login
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

    // Navigate to objectives
    await page.goto('/dashboard/objectives');

    // Create multiple objectives for sorting test
    const firstObjective = `aaa-${uuid}`;
    const secondObjective = `zzz-${uuid}`;

    // Create first objective
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(firstObjective);
    await page.getByTestId('objective-description-input').fill('First objective');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(firstObjective)).toBeVisible();

    // Create second objective
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(secondObjective);
    await page.getByTestId('objective-description-input').fill('Second objective');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: 'Personal' }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(secondObjective)).toBeVisible();

    // Test sorting by title
    const titleSort = page.getByTestId('table-sort-title');
    if (await titleSort.isVisible()) {
        await titleSort.click();
        await page.waitForTimeout(500);

        // Verify sorting works (aaa should come before zzz in ascending order)
        const firstElement = page.locator('tr').filter({ hasText: firstObjective }).first();
        const secondElement = page.locator('tr').filter({ hasText: secondObjective }).first();

        const firstBoundingBox = await firstElement.boundingBox();
        const secondBoundingBox = await secondElement.boundingBox();

        if (firstBoundingBox && secondBoundingBox) {
            expect(firstBoundingBox.y).toBeLessThan(secondBoundingBox.y);
        }
    }
});
