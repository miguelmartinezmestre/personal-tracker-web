import { test, expect } from '../../fixtures/test-base';

async function openThemeMenu(
    page: import('@playwright/test').Page,
    option: 'light' | 'dark'
): Promise<void> {
    const toggle = page.getByTestId('theme-toggle');
    const desiredOption = page.getByTestId(`theme-option-${option}`);

    for (let attempt = 0; attempt < 3; attempt++) {
        await expect(toggle).toBeVisible({ timeout: 15000 });
        await toggle.click();

        if (await desiredOption.isVisible().catch(() => false)) {
            return;
        }
    }

    await expect(desiredOption).toBeVisible({ timeout: 5000 });
}

test.describe('Theme Switching', () => {
    test(
        'toggle dark mode applies dark class to html',
        { tag: ['@REQ-NF-021'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await openThemeMenu(authenticatedPage, 'dark');
            const darkOption = authenticatedPage.getByTestId('theme-option-dark');
            await darkOption.click();

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

            await openThemeMenu(authenticatedPage, 'dark');
            const darkOption = authenticatedPage.getByTestId('theme-option-dark');
            await darkOption.click();
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });

            await openThemeMenu(authenticatedPage, 'light');
            const lightOption = authenticatedPage.getByTestId('theme-option-light');
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

            await openThemeMenu(authenticatedPage, 'dark');
            const darkOption = authenticatedPage.getByTestId('theme-option-dark');
            await darkOption.click();
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });

            await authenticatedPage.reload();
            await authenticatedPage.waitForLoadState('domcontentloaded');
            await expect(authenticatedPage.locator('html')).toHaveAttribute('class', /dark/, {
                timeout: 5000,
            });

            await openThemeMenu(authenticatedPage, 'light');
            const lightOption = authenticatedPage.getByTestId('theme-option-light');
            await lightOption.click();
        }
    );
});
