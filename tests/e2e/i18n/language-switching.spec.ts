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
        'language preference persists after navigation',
        { tag: ['@REQ-NF-007', '@cross-browser-critical', '@mobile-critical'] },
        async ({ page }) => {
            await page.goto('/dashboard/home');
            await switchLanguage(page, 'es');
            await page.goto('/dashboard/objectives');
            await expect(page.getByTestId('language-switcher')).toContainText(
                /español|spanish|es/i
            );
        }
    );

    test(
        'landing navigation is translated after changing locale',
        { tag: ['@REQ-NF-007', '@cross-browser-critical', '@mobile-critical'] },
        async ({ page }) => {
            await page.goto('/');
            await switchLanguage(page, 'es');
            await expect(page.locator('[data-testid="navbar-register-link"]:visible')).toHaveText(
                'Registrarse'
            );
            await expect(page.locator('[data-testid="navbar-login-link"]:visible')).toHaveText(
                'Iniciar sesión'
            );
        }
    );
});
