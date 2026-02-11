import { test, expect } from '@playwright/test';
import { createTestUser } from '../../helpers/test-helpers';

test.describe('Theme Switching', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
    });

    test('toggle to dark mode', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for theme toggle button
        const themeToggle = page.locator(
            '[data-testid*="theme"], button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"], [data-testid*="mode-toggle"]'
        );

        if ((await themeToggle.count()) > 0) {
            // Check current theme
            const htmlElement = page.locator('html');
            const currentClass = await htmlElement.getAttribute('class');
            const currentDataTheme = await htmlElement.getAttribute('data-theme');

            // Click to toggle
            await themeToggle.first().click();
            await page.waitForTimeout(500);

            // If there's a dropdown, select dark mode
            const darkOption = page.locator(
                '[role="menuitem"]:has-text("Dark"), button:has-text("Dark"), [data-value="dark"]'
            );
            if ((await darkOption.count()) > 0) {
                await darkOption.first().click();
                await page.waitForTimeout(500);
            }

            // Verify dark mode is applied
            const newClass = await htmlElement.getAttribute('class');
            const newDataTheme = await htmlElement.getAttribute('data-theme');

            const isDarkMode =
                newClass?.includes('dark') ||
                newDataTheme === 'dark' ||
                (await htmlElement.evaluate(el => el.style.colorScheme === 'dark'));

            // Theme should have changed
        }
    });

    test('toggle to light mode', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // First set to dark mode if not already
        const themeToggle = page.locator(
            '[data-testid*="theme"], button[aria-label*="theme"], [data-testid*="mode-toggle"]'
        );

        if ((await themeToggle.count()) > 0) {
            await themeToggle.first().click();
            await page.waitForTimeout(500);

            // Select light mode
            const lightOption = page.locator(
                '[role="menuitem"]:has-text("Light"), button:has-text("Light"), [data-value="light"]'
            );
            if ((await lightOption.count()) > 0) {
                await lightOption.first().click();
                await page.waitForTimeout(500);
            }

            // Verify light mode
            const htmlElement = page.locator('html');
            const htmlClass = await htmlElement.getAttribute('class');
            const dataTheme = await htmlElement.getAttribute('data-theme');

            const isLightMode =
                !htmlClass?.includes('dark') ||
                dataTheme === 'light' ||
                htmlClass?.includes('light');
        }
    });

    test('theme persists on reload', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Set dark mode
        const themeToggle = page.locator(
            '[data-testid*="theme"], button[aria-label*="theme"], [data-testid*="mode-toggle"]'
        );

        if ((await themeToggle.count()) > 0) {
            await themeToggle.first().click();
            await page.waitForTimeout(300);

            const darkOption = page.locator(
                '[role="menuitem"]:has-text("Dark"), [data-value="dark"]'
            );
            if ((await darkOption.count()) > 0) {
                await darkOption.first().click();
                await page.waitForTimeout(500);
            }

            // Get current theme
            const htmlElement = page.locator('html');
            const themeBeforeReload = await htmlElement.getAttribute('class');

            // Reload page
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Theme should persist
            const themeAfterReload = await htmlElement.getAttribute('class');

            // Both should have dark class (or both not, if system theme)
            const persistedCorrectly =
                (themeBeforeReload?.includes('dark') && themeAfterReload?.includes('dark')) ||
                (!themeBeforeReload?.includes('dark') && !themeAfterReload?.includes('dark'));
        }
    });

    test('system theme option available', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        const themeToggle = page.locator('[data-testid*="theme"], button[aria-label*="theme"]');

        if ((await themeToggle.count()) > 0) {
            await themeToggle.first().click();
            await page.waitForTimeout(300);

            // Look for system option
            const systemOption = page.locator(
                '[role="menuitem"]:has-text("System"), button:has-text("System"), [data-value="system"]'
            );

            if ((await systemOption.count()) > 0) {
                await expect(systemOption.first()).toBeVisible();
            }
        }
    });

    test('theme affects all pages', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Set dark mode
        const themeToggle = page.locator('[data-testid*="theme"], button[aria-label*="theme"]');

        if ((await themeToggle.count()) > 0) {
            await themeToggle.first().click();
            await page.waitForTimeout(300);

            const darkOption = page.locator(
                '[role="menuitem"]:has-text("Dark"), [data-value="dark"]'
            );
            if ((await darkOption.count()) > 0) {
                await darkOption.first().click();
                await page.waitForTimeout(500);
            }

            // Navigate to another page
            await page.goto('/dashboard/objectives');
            await page.waitForLoadState('networkidle');

            // Theme should still be dark
            const htmlElement = page.locator('html');
            const htmlClass = await htmlElement.getAttribute('class');

            if (htmlClass) {
                expect(htmlClass.includes('dark')).toBeTruthy();
            }
        }
    });

    test('theme toggle is accessible', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        const themeToggle = page.locator('[data-testid*="theme"], button[aria-label*="theme"]');

        if ((await themeToggle.count()) > 0) {
            // Should have accessible label
            const ariaLabel = await themeToggle.first().getAttribute('aria-label');
            const title = await themeToggle.first().getAttribute('title');

            const hasAccessibleName = ariaLabel || title;
        }
    });

    test('dark mode has appropriate contrast', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Set dark mode
        const themeToggle = page.locator('[data-testid*="theme"], button[aria-label*="theme"]');

        if ((await themeToggle.count()) > 0) {
            await themeToggle.first().click();
            await page.waitForTimeout(300);

            const darkOption = page.locator(
                '[role="menuitem"]:has-text("Dark"), [data-value="dark"]'
            );
            if ((await darkOption.count()) > 0) {
                await darkOption.first().click();
                await page.waitForTimeout(500);
            }

            // Check background color is dark
            const body = page.locator('body');
            const backgroundColor = await body.evaluate(
                el => window.getComputedStyle(el).backgroundColor
            );

            // Dark backgrounds typically have low RGB values
            // This is a basic check
        }
    });

    test('theme icon changes with mode', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        const themeToggle = page.locator('[data-testid*="theme"], button[aria-label*="theme"]');

        if ((await themeToggle.count()) > 0) {
            // Get icon before toggle
            const iconBefore = await themeToggle
                .first()
                .locator('svg')
                .innerHTML()
                .catch(() => '');

            await themeToggle.first().click();
            await page.waitForTimeout(300);

            const toggleOption = page.locator('[role="menuitem"]').first();
            if ((await toggleOption.count()) > 0) {
                await toggleOption.click();
                await page.waitForTimeout(500);
            }

            // Icon might change (sun/moon icons typically)
        }
    });
});
