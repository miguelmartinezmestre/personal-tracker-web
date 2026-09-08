import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test-base';

async function openCommandPalette(page: Page) {
    await page.goto('/dashboard/home');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('command-menu-ready')).toBeAttached({ timeout: 10000 });
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
}

test.describe('Command Palette', () => {
    test(
        'Cmd+K opens, filters and closes the command palette',
        { tag: ['@REQ-NF-012'] },
        async ({ isolatedAuthenticatedPage }) => {
            await openCommandPalette(isolatedAuthenticatedPage);

            const commandInput = isolatedAuthenticatedPage.getByTestId('command-input');
            await expect(commandInput).toBeVisible();
            await commandInput.fill('home');
            await expect(isolatedAuthenticatedPage.getByTestId('command-item-home')).toBeVisible();

            await isolatedAuthenticatedPage.keyboard.press('Escape');
            await expect(isolatedAuthenticatedPage.locator('[role="dialog"]')).toBeHidden({
                timeout: 5000,
            });
        }
    );

    test(
        'selecting a command navigates to its page',
        { tag: ['@REQ-NF-012'] },
        async ({ isolatedAuthenticatedPage }) => {
            await openCommandPalette(isolatedAuthenticatedPage);

            const objectivesItem = isolatedAuthenticatedPage.getByTestId('command-item-objectives');
            await expect(objectivesItem).toBeVisible();
            await objectivesItem.click();

            await isolatedAuthenticatedPage.waitForURL(/\/dashboard\/objectives/, {
                timeout: 10000,
            });
        }
    );
});
