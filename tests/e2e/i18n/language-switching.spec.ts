import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test-base';

async function switchLanguage(page: Page, locale: 'es' | 'en'): Promise<void> {
    const switcher = page.getByTestId('language-switcher');
    await expect(switcher).toBeVisible({ timeout: 15000 });
    await switcher.click();
    await page.getByTestId(`language-option-${locale}`).click();
    await page.waitForLoadState('domcontentloaded');
}

test.describe('Language Switching', () => {
    test(
        'language preference persists after navigation',
        { tag: ['@REQ-NF-007'] },
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
        { tag: ['@REQ-NF-007'] },
        async ({ page }) => {
            await page.goto('/');
            await switchLanguage(page, 'es');
            await expect(page.getByTestId('navbar-register-link')).toHaveText('Registrarse');
            await expect(page.getByTestId('navbar-login-link')).toHaveText('Iniciar sesión');
        }
    );
});
