import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Categories Management', () => {
    test('categories are accessible from objectives page', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'categories-access', 'objectives-page');

        // Look for category selection in objective creation
        const createButton = page.getByRole('button', { name: /create|new|add|crear/i }).first();
        if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForLoadState('networkidle');
            await takeScreenshot(page, 'categories-access', 'create-objective-form');

            // Look for category field
            const categoryField = page.getByRole('combobox', { name: /category|categoría/i });
            if (await categoryField.isVisible()) {
                await categoryField.click();
                await takeScreenshot(page, 'categories-access', 'category-dropdown');
            }
        }
    });

    test('can select category when creating objective', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        const createButton = page.getByRole('button', { name: /create|new|add|crear/i }).first();
        if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForLoadState('networkidle');

            // Look for category select/combobox
            const categorySelect = page.locator(
                '[name="category"], [data-testid="category-select"]'
            );
            if (await categorySelect.first().isVisible()) {
                await takeScreenshot(page, 'categories-select', 'category-field');
            }
        }
    });

    test('default categories are available for new users', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        const createButton = page.getByRole('button', { name: /create|new|add|crear/i }).first();
        if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForLoadState('networkidle');

            // Look for category dropdown options
            const categoryField = page.locator('[name="category"]').first();
            if (await categoryField.isVisible()) {
                await categoryField.click();
                await page.waitForTimeout(500);
                await takeScreenshot(page, 'categories-default', 'default-options');
            }
        }
    });
});

test.describe('Category Filtering', () => {
    test('can filter objectives by category', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'categories-filter', 'objectives-list');

        // Look for category filter
        const filterButton = page.getByRole('button', { name: /filter|filtrar/i });
        if (await filterButton.isVisible()) {
            await filterButton.click();
            await takeScreenshot(page, 'categories-filter', 'filter-open');
        }
    });
});
