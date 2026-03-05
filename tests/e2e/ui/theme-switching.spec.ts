import { test, expect } from '../../fixtures/test-base';

test.describe('Theme Switching', () => {
    test('toggle dark mode applies dark class to html', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        // sr-only text is "Change theme" (en) or "Cambiar tema" (es)
        const themeToggle = authenticatedPage.getByRole('button', {
            name: /change theme|cambiar tema/i,
        });
        await expect(themeToggle).toBeVisible({ timeout: 15000 });
        await themeToggle.click();

        // Select dark mode from dropdown (rendered in a portal)
        const darkOption = authenticatedPage.getByRole('menuitem', { name: /dark|oscuro/i });
        await expect(darkOption).toBeVisible({ timeout: 5000 });
        await darkOption.click();

        // Wait for theme to apply
        await authenticatedPage.waitForTimeout(500);

        // html element should have class 'dark'
        const htmlClass = await authenticatedPage.locator('html').getAttribute('class');
        expect(htmlClass).toContain('dark');
    });

    test('toggle light mode removes dark class', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        const themeToggle = authenticatedPage.getByRole('button', {
            name: /change theme|cambiar tema/i,
        });
        await expect(themeToggle).toBeVisible({ timeout: 15000 });

        // First set to dark
        await themeToggle.click();
        const darkOption = authenticatedPage.getByRole('menuitem', { name: /dark|oscuro/i });
        await expect(darkOption).toBeVisible({ timeout: 5000 });
        await darkOption.click();
        await authenticatedPage.waitForTimeout(500);

        // Now switch to light
        await themeToggle.click();
        const lightOption = authenticatedPage.getByRole('menuitem', {
            name: /^light$|^claro$/i,
        });
        await expect(lightOption).toBeVisible({ timeout: 5000 });
        await lightOption.click();
        await authenticatedPage.waitForTimeout(500);

        // html element should have class 'light' or not have 'dark'
        const htmlClass = await authenticatedPage.locator('html').getAttribute('class');
        expect(htmlClass).not.toContain('dark');
    });

    test('theme preference persists after page reload', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        const themeToggle = authenticatedPage.getByRole('button', {
            name: /change theme|cambiar tema/i,
        });
        await expect(themeToggle).toBeVisible({ timeout: 15000 });

        // Set dark mode
        await themeToggle.click();
        const darkOption = authenticatedPage.getByRole('menuitem', { name: /dark|oscuro/i });
        await expect(darkOption).toBeVisible({ timeout: 5000 });
        await darkOption.click();
        await authenticatedPage.waitForTimeout(500);

        // Reload page
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Dark mode should persist
        const htmlClass = await authenticatedPage.locator('html').getAttribute('class');
        expect(htmlClass).toContain('dark');

        // Clean up: switch back to light
        const toggle = authenticatedPage.getByRole('button', {
            name: /change theme|cambiar tema/i,
        });
        await expect(toggle).toBeVisible({ timeout: 10000 });
        await toggle.click();
        const lightOption = authenticatedPage.getByRole('menuitem', {
            name: /^light$|^claro$/i,
        });
        await expect(lightOption).toBeVisible({ timeout: 5000 });
        await lightOption.click();
    });
});
