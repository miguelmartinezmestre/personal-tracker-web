import { test, expect } from '../../fixtures/test-base';

test.describe('Command Palette', () => {
    test(
        'Cmd+K opens the command palette',
        { tag: ['@REQ-NF-021'] },
        async ({ isolatedAuthenticatedPage }) => {
            await isolatedAuthenticatedPage.goto('/dashboard/home');
            await isolatedAuthenticatedPage.waitForLoadState('domcontentloaded');

            await expect(isolatedAuthenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await isolatedAuthenticatedPage.keyboard.press('Meta+k');

            const dialog = isolatedAuthenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            const commandInput = isolatedAuthenticatedPage.getByTestId('command-input');
            await expect(commandInput).toBeVisible();
        }
    );

    test(
        'typing filters command items',
        { tag: ['@REQ-NF-021'] },
        async ({ isolatedAuthenticatedPage }) => {
            await isolatedAuthenticatedPage.goto('/dashboard/home');
            await isolatedAuthenticatedPage.waitForLoadState('domcontentloaded');

            await expect(isolatedAuthenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await isolatedAuthenticatedPage.keyboard.press('Meta+k');

            const dialog = isolatedAuthenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            const commandInput = isolatedAuthenticatedPage.getByTestId('command-input');
            await commandInput.fill('home');

            const homeItem = isolatedAuthenticatedPage.getByTestId('command-item-home');
            await expect(homeItem).toBeVisible();
        }
    );

    test(
        'selecting item navigates to the correct page',
        { tag: ['@REQ-NF-021'] },
        async ({ isolatedAuthenticatedPage }) => {
            await isolatedAuthenticatedPage.goto('/dashboard/home');
            await isolatedAuthenticatedPage.waitForLoadState('domcontentloaded');

            await expect(isolatedAuthenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await isolatedAuthenticatedPage.keyboard.press('Meta+k');

            const dialog = isolatedAuthenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            const objectivesItem = isolatedAuthenticatedPage.getByTestId('command-item-objectives');
            await expect(objectivesItem).toBeVisible();
            await objectivesItem.click();

            await isolatedAuthenticatedPage.waitForURL(/\/dashboard\/objectives/, {
                timeout: 10000,
            });
        }
    );

    test(
        'Escape closes the command palette',
        { tag: ['@REQ-NF-021'] },
        async ({ isolatedAuthenticatedPage }) => {
            await isolatedAuthenticatedPage.goto('/dashboard/home');
            await isolatedAuthenticatedPage.waitForLoadState('domcontentloaded');

            await expect(isolatedAuthenticatedPage.getByTestId('command-menu-ready')).toBeAttached({
                timeout: 10000,
            });

            await isolatedAuthenticatedPage.keyboard.press('Meta+k');

            const dialog = isolatedAuthenticatedPage.locator('[role="dialog"]');
            await expect(dialog).toBeVisible({ timeout: 5000 });

            await isolatedAuthenticatedPage.keyboard.press('Escape');

            await expect(dialog).toBeHidden({ timeout: 5000 });
        }
    );
});
