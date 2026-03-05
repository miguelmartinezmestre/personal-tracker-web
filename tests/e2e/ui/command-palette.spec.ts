import { test, expect } from '../../fixtures/test-base';

test.describe('Command Palette', () => {
    test('Cmd+K opens the command palette', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Press Cmd+K (Meta+K on Mac, Ctrl+K on Linux/Windows)
        await authenticatedPage.keyboard.press('Meta+k');

        // Command dialog should be visible
        const dialog = authenticatedPage.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Command input should be visible
        const commandInput = authenticatedPage.getByTestId('command-input');
        await expect(commandInput).toBeVisible();
    });

    test('typing filters command items', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Open command palette
        await authenticatedPage.keyboard.press('Meta+k');

        const dialog = authenticatedPage.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Type to filter
        const commandInput = authenticatedPage.getByTestId('command-input');
        await commandInput.fill('home');

        // Home item should still be visible
        const homeItem = authenticatedPage.getByTestId('command-item-home');
        await expect(homeItem).toBeVisible();
    });

    test('selecting item navigates to the correct page', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Open command palette
        await authenticatedPage.keyboard.press('Meta+k');

        const dialog = authenticatedPage.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Click on objectives item
        const objectivesItem = authenticatedPage.getByTestId('command-item-objectives');
        await expect(objectivesItem).toBeVisible();
        await objectivesItem.click();

        // Should navigate to objectives page
        await authenticatedPage.waitForURL(/\/dashboard\/objectives/, { timeout: 10000 });
    });

    test('Escape closes the command palette', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Open command palette
        await authenticatedPage.keyboard.press('Meta+k');

        const dialog = authenticatedPage.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Press Escape
        await authenticatedPage.keyboard.press('Escape');

        // Dialog should be hidden
        await expect(dialog).toBeHidden({ timeout: 5000 });
    });
});
