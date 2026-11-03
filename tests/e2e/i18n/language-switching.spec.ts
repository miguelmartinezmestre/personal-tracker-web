import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test-base';

async function switchLanguage(page: Page, locale: 'es' | 'en'): Promise<void> {
    const switcher = page.locator('[data-testid="language-switcher"]:visible');
    const menu = page.getByTestId('header-menu-toggle');

    if (!(await switcher.isVisible()) && (await menu.isVisible())) {
        await menu.click();
    }

    await expect(switcher).toBeVisible({ timeout: 15000 });
    await switcher.click();
    await page.getByTestId(`language-option-${locale}`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', locale, { timeout: 15000 });
}

test.describe('Language Switching', () => {
    test(
        'the chosen language translates the interface and persists after navigation',
        { tag: ['@REQ-NF-007', '@INH-UI-01', '@cross-browser-critical', '@mobile-critical'] },
        async ({ page }) => {
            await page.goto('/');
            await switchLanguage(page, 'es');
            await expect(page.locator('[data-testid="navbar-dashboard-link"]:visible')).toHaveText(
                'Ir al panel'
            );

            await page.goto('/dashboard/organizations');
            await expect(page.locator('html')).toHaveAttribute('lang', 'es');
            await expect(page.getByTestId('organizations-title')).toHaveText('Organizaciones');
        }
    );
});
