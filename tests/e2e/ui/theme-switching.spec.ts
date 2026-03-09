import { test, expect } from '../../fixtures/test-base';

test.describe('Theme Switching', () => {
    test(
        'toggle dark mode applies dark class to html',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            // sr-only text is "Change theme" (en) or "Cambiar tema" (es)
            const themeToggle = authenticatedPage.getByTestId('theme-toggle');
            await expect(themeToggle).toBeVisible({ timeout: 15000 });
            await themeToggle.click();

            // Select dark mode from dropdown (rendered in a portal)
            const darkOption = authenticatedPage.getByTestId('theme-option-dark');
            await expect(darkOption).toBeVisible({ timeout: 5000 });
            await darkOption.click();

            // Wait for theme to apply
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });
        }
    );

    test(
        'toggle light mode removes dark class',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const themeToggle = authenticatedPage.getByTestId('theme-toggle');
            await expect(themeToggle).toBeVisible({ timeout: 15000 });

            // First set to dark
            await themeToggle.click();
            const darkOption = authenticatedPage.getByTestId('theme-option-dark');
            await expect(darkOption).toBeVisible({ timeout: 5000 });
            await darkOption.click();
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });

            // Now switch to light
            await themeToggle.click();
            const lightOption = authenticatedPage.getByTestId('theme-option-light');
            await expect(lightOption).toBeVisible({ timeout: 5000 });
            await lightOption.click();
            await expect
                .poll(async () => await authenticatedPage.locator('html').getAttribute('class'), {
                    timeout: 5000,
                })
                .not.toContain('dark');
        }
    );

    test(
        'theme preference persists after page reload',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const themeToggle = authenticatedPage.getByTestId('theme-toggle');
            await expect(themeToggle).toBeVisible({ timeout: 15000 });

            // Set dark mode
            await themeToggle.click();
            const darkOption = authenticatedPage.getByTestId('theme-option-dark');
            await expect(darkOption).toBeVisible({ timeout: 5000 });
            await darkOption.click();
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });

            // Reload page
            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState('domcontentloaded');
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });

            // Clean up: switch back to light
            const toggle = authenticatedPage.getByTestId('theme-toggle');
            await expect(toggle).toBeVisible({ timeout: 10000 });
            await toggle.click();
            const lightOption = authenticatedPage.getByTestId('theme-option-light');
            await expect(lightOption).toBeVisible({ timeout: 5000 });
            await lightOption.click();
        }
    );
});
