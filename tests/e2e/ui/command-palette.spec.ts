import { test, expect } from '../../fixtures/test-base';

test.describe('Command Palette', () => {
    test(
        'Cmd+K opens the command palette',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expect(authenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await authenticatedPage.keyboard.press('Meta+k');

            const dialog = authenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            const commandInput = authenticatedPage.getByTestId('command-input');
            await expect(commandInput).toBeVisible();
        }
    );

    test(
        'typing filters command items',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expect(authenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await authenticatedPage.keyboard.press('Meta+k');

            const dialog = authenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            const commandInput = authenticatedPage.getByTestId('command-input');
            await commandInput.fill('home');

            const homeItem = authenticatedPage.getByTestId('command-item-home');
            await expect(homeItem).toBeVisible();
        }
    );

    test(
        'selecting item navigates to the correct page',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expect(authenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await authenticatedPage.keyboard.press('Meta+k');

            const dialog = authenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            const objectivesItem = authenticatedPage.getByTestId('command-item-objectives');
            await expect(objectivesItem).toBeVisible();
            await objectivesItem.click();

            await authenticatedPage.waitForURL(/\/dashboard\/objectives/, { timeout: 10000 });
        }
    );

    test(
        'Escape closes the command palette',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expect(authenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await authenticatedPage.keyboard.press('Meta+k');

            const dialog = authenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            await authenticatedPage.keyboard.press('Escape');

            await expect(dialog).toBeHidden({ timeout: 5000 });
        }
    );
});
