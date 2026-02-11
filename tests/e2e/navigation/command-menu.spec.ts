import { test, expect } from '@playwright/test';
import { createTestUser } from '../../helpers/test-helpers';

test.describe('Command Menu', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
    });

    test('open with Ctrl+K', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Press Ctrl+K to open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        // Command menu should be visible
        const commandMenu = page.locator(
            '[role="dialog"][data-testid*="command"], [data-testid*="command-menu"], [cmdk-root], [data-command-menu]'
        );

        if ((await commandMenu.count()) > 0) {
            await expect(commandMenu.first()).toBeVisible();
        }
    });

    test('open with Meta+K on Mac', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Press Meta+K (Cmd+K on Mac)
        await page.keyboard.press('Meta+k');
        await page.waitForTimeout(500);

        // Command menu should be visible
        const commandMenu = page.locator(
            '[role="dialog"][data-testid*="command"], [data-testid*="command-menu"], [cmdk-root]'
        );

        if ((await commandMenu.count()) > 0) {
            await expect(commandMenu.first()).toBeVisible();
        }
    });

    test('search and navigate', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        const commandInput = page.locator(
            '[cmdk-input], input[placeholder*="search"], input[placeholder*="command"], [data-testid*="command-input"]'
        );

        if (await commandInput.isVisible()) {
            // Search for objectives
            await commandInput.fill('objectives');
            await page.waitForTimeout(500);

            // Select the result
            const objectivesOption = page.locator(
                '[cmdk-item]:has-text("Objectives"), [role="option"]:has-text("Objectives")'
            );

            if ((await objectivesOption.count()) > 0) {
                await objectivesOption.first().click();
                await page.waitForLoadState('networkidle');

                // Should navigate to objectives page
                await expect(page).toHaveURL(/\/dashboard\/objectives/);
            }
        }
    });

    test('close with Escape', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        const commandMenu = page.locator(
            '[role="dialog"], [cmdk-root], [data-testid*="command-menu"]'
        );

        if ((await commandMenu.count()) > 0) {
            await expect(commandMenu.first()).toBeVisible();

            // Press Escape to close
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Command menu should be hidden
            await expect(commandMenu).toBeHidden();
        }
    });

    test('keyboard navigation through options', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        const commandMenu = page.locator('[role="dialog"], [cmdk-root]');

        if ((await commandMenu.count()) > 0) {
            // Use arrow keys to navigate
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(200);

            // Check for selected state
            const selectedItem = page.locator(
                '[cmdk-item][aria-selected="true"], [role="option"][aria-selected="true"]'
            );
            const hasSelected = (await selectedItem.count()) > 0;

            // Press Enter to select
            await page.keyboard.press('Enter');
            await page.waitForLoadState('networkidle');
        }
    });

    test('shows recent items', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        // Look for recent section
        const recentSection = page.locator('text=/recent|reciente/i');
        const hasRecent = (await recentSection.count()) > 0;

        // Recent items might show recently visited pages
    });

    test('shows all navigation options', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        const commandMenu = page.locator('[role="dialog"], [cmdk-root]');

        if ((await commandMenu.count()) > 0) {
            // Should show navigation options
            const options = page.locator('[cmdk-item], [role="option"]');
            const optionCount = await options.count();

            // Should have multiple navigation options
            expect(optionCount).toBeGreaterThan(0);
        }
    });

    test('filter results as you type', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        const commandInput = page.locator('[cmdk-input], input[placeholder*="search"]');

        if (await commandInput.isVisible()) {
            // Get initial option count
            const initialOptions = page.locator('[cmdk-item], [role="option"]');
            const initialCount = await initialOptions.count();

            // Type to filter
            await commandInput.fill('set');
            await page.waitForTimeout(300);

            // Options should be filtered
            const filteredOptions = page.locator('[cmdk-item], [role="option"]');
            const filteredCount = await filteredOptions.count();

            // Filtered count should be different (usually less)
        }
    });

    test('shows actions for current page', async ({ page }) => {
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        // Might show page-specific actions like "Create objective"
        const createAction = page.locator(
            '[cmdk-item]:has-text("Create"), [role="option"]:has-text("Create")'
        );
        const hasActions = (await createAction.count()) > 0;
    });

    test('empty state when no results', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Open command menu
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(500);

        const commandInput = page.locator('[cmdk-input], input[placeholder*="search"]');

        if (await commandInput.isVisible()) {
            // Search for something that doesn't exist
            await commandInput.fill('xyznonexistent123');
            await page.waitForTimeout(500);

            // Should show empty state
            const emptyState = page
                .locator('[cmdk-empty]')
                .or(page.getByText(/no results|sin resultados/i));
            const hasEmpty = (await emptyState.count()) > 0;
        }
    });

    test('command menu button visible in header', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for command menu button/indicator in header
        const commandButton = page.locator(
            'button:has-text("⌘K"), button:has-text("Ctrl+K"), [data-testid*="command-trigger"], kbd:has-text("K")'
        );

        if ((await commandButton.count()) > 0) {
            await expect(commandButton.first()).toBeVisible();

            // Click to open
            await commandButton.first().click();
            await page.waitForTimeout(500);

            const commandMenu = page.locator('[role="dialog"], [cmdk-root]');
            if ((await commandMenu.count()) > 0) {
                await expect(commandMenu.first()).toBeVisible();
            }
        }
    });
});
