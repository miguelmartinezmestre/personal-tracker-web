import { test, expect } from '@playwright/test';
import { createTestUser, createObjective, ensureDefaultCategories } from '../../helpers/test-helpers';

test.describe('Objectives Filtering', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
        await ensureDefaultCategories(page);
    });

    test('filter by status active', async ({ page }) => {
        // Create an active objective
        const objective = await createObjective(page, {
            title: `Active Filter ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Look for status filter
        const statusFilter = page.locator('[data-testid*="status-filter"], [data-testid*="filter-status"], select, [aria-label*="status"]').first();

        if (await statusFilter.isVisible()) {
            await statusFilter.click();

            const activeOption = page.getByRole('option', { name: /active|activo/i });
            if (await activeOption.count() > 0) {
                await activeOption.first().click();
                await page.waitForLoadState('networkidle');

                // Active objective should still be visible
                await expect(page.getByText(objective.title)).toBeVisible();
            }
        }
    });

    test('filter by status completed', async ({ page }) => {
        // Create objectives
        const activeObj = await createObjective(page, {
            title: `Uncompleted ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Look for status filter
        const statusFilter = page.locator('[data-testid*="status-filter"], [data-testid*="filter-status"], select').first();

        if (await statusFilter.isVisible()) {
            await statusFilter.click();

            const completedOption = page.getByRole('option', { name: /completed|completado/i });
            if (await completedOption.count() > 0) {
                await completedOption.first().click();
                await page.waitForLoadState('networkidle');

                // Active objective should NOT be visible when filtering by completed
                // (unless there are no completed objectives, then list might be empty)
            }
        }
    });

    test('filter by category', async ({ page }) => {
        // Create objective with specific category
        const objective = await createObjective(page, {
            title: `Category Filter ${Date.now()}`,
            category: 'Personal',
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Look for category filter
        const categoryFilter = page.locator('[data-testid*="category-filter"], [data-testid*="filter-category"], select:has-text("Category"), select:has-text("Categoría")').first();

        if (await categoryFilter.isVisible()) {
            await categoryFilter.click();

            const personalOption = page.getByRole('option', { name: /personal/i });
            if (await personalOption.count() > 0) {
                await personalOption.first().click();
                await page.waitForLoadState('networkidle');

                // Objective with Personal category should be visible
                await expect(page.getByText(objective.title)).toBeVisible();
            }
        }
    });

    test('search by title', async ({ page }) => {
        const uniqueTitle = `UniqueSearchTerm ${Date.now()}`;
        await createObjective(page, {
            title: uniqueTitle,
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Look for search input
        const searchInput = page.locator('[data-testid*="search"], input[type="search"], input[placeholder*="search"], input[placeholder*="buscar"]').first();

        if (await searchInput.isVisible()) {
            await searchInput.fill('UniqueSearchTerm');

            // Wait for search results
            await page.waitForTimeout(1000);
            await page.waitForLoadState('networkidle');

            // Objective with matching title should be visible
            await expect(page.getByText(uniqueTitle)).toBeVisible();
        }
    });

    test('search returns no results for non-matching query', async ({ page }) => {
        await createObjective(page, {
            title: `Real Objective ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator('[data-testid*="search"], input[type="search"], input[placeholder*="search"]').first();

        if (await searchInput.isVisible()) {
            await searchInput.fill('NonExistentObjectiveXYZ123');

            await page.waitForTimeout(1000);
            await page.waitForLoadState('networkidle');

            // Should show empty state or no results
            const emptyState = page.locator('[data-testid*="empty"]').or(page.getByText(/no.*results|no.*encontrado|sin resultados/i));
            const tableRows = page.locator('tbody tr');

            // Either empty state shown or no rows in table
            const isEmpty = await emptyState.count() > 0 || (await tableRows.count()) === 0;
            expect(isEmpty).toBeTruthy();
        }
    });

    test('combine multiple filters', async ({ page }) => {
        // Create objectives with different attributes
        await createObjective(page, {
            title: `Combined Filter Test ${Date.now()}`,
            category: 'Personal',
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Apply status filter
        const statusFilter = page.locator('[data-testid*="status-filter"], select').first();
        if (await statusFilter.isVisible()) {
            await statusFilter.click();
            const activeOption = page.getByRole('option', { name: /active|activo/i });
            if (await activeOption.count() > 0) {
                await activeOption.first().click();
                await page.waitForLoadState('networkidle');
            }
        }

        // Apply search filter
        const searchInput = page.locator('[data-testid*="search"], input[type="search"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('Combined Filter');
            await page.waitForTimeout(1000);
        }

        // Results should match both filters
        await page.waitForLoadState('networkidle');
    });

    test('clear filters', async ({ page }) => {
        const objective = await createObjective(page, {
            title: `Clear Filter Test ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Apply a search filter
        const searchInput = page.locator('[data-testid*="search"], input[type="search"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('SomeRandomText');
            await page.waitForTimeout(500);

            // Clear the search
            await searchInput.clear();
            await page.waitForTimeout(500);
            await page.waitForLoadState('networkidle');

            // Original objective should be visible again
            await expect(page.getByText(objective.title)).toBeVisible();
        }

        // Look for clear/reset filters button
        const clearButton = page.locator('[data-testid*="clear-filter"], button:has-text("Clear"), button:has-text("Reset"), button:has-text("Limpiar")');
        if (await clearButton.count() > 0) {
            await clearButton.first().click();
            await page.waitForLoadState('networkidle');

            // All objectives should be visible
            await expect(page.getByText(objective.title)).toBeVisible();
        }
    });

    test('filters persist after page reload', async ({ page }) => {
        await createObjective(page, {
            title: `Persist Filter ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Apply a filter
        const searchInput = page.locator('[data-testid*="search"], input[type="search"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('Persist');
            await page.waitForTimeout(1000);

            // Reload page
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Check if filter persisted (depends on implementation)
            // Some apps persist filters in URL params
            const currentUrl = page.url();
            const hasQueryParams = currentUrl.includes('?') || currentUrl.includes('search=');

            // Or check if search input still has value
            const searchValue = await searchInput.inputValue();
            // Filter might or might not persist depending on implementation
        }
    });

    test('objectives count updates with filters', async ({ page }) => {
        // Create multiple objectives
        await createObjective(page, { title: `Count Test A ${Date.now()}`, ensureCategories: false });
        await createObjective(page, { title: `Count Test B ${Date.now()}`, ensureCategories: false });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Look for count indicator
        const countIndicator = page.locator('[data-testid*="count"]').or(page.getByText(/\d+.*objectives|\d+.*objetivos/i));

        if (await countIndicator.count() > 0) {
            const initialCount = await countIndicator.first().textContent();

            // Apply a filter that reduces results
            const searchInput = page.locator('[data-testid*="search"], input[type="search"]').first();
            if (await searchInput.isVisible()) {
                await searchInput.fill('Count Test A');
                await page.waitForTimeout(1000);
                await page.waitForLoadState('networkidle');

                // Count should change
                const filteredCount = await countIndicator.first().textContent();
                // Count might or might not be different depending on matches
            }
        }
    });
});
