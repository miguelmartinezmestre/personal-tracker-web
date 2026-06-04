import { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test-base';

async function switchLanguage(
    page: Page,
    option: 'es' | 'en',
    expectedText: RegExp
): Promise<void> {
    const languageSwitcher = page.getByTestId('language-switcher');

    for (let attempt = 0; attempt < 3; attempt++) {
        await page.keyboard.press('Escape').catch(() => undefined);
        await expect(page.getByRole('menu'))
            .toBeHidden({ timeout: 2000 })
            .catch(() => undefined);

        await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
        await languageSwitcher.click();

        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible({ timeout: 5000 });
        await menu.getByTestId(`language-option-${option}`).click();
        await expect(menu).toBeHidden({ timeout: 5000 });
        await page.waitForLoadState('domcontentloaded');

        try {
            await expect(languageSwitcher).toContainText(expectedText, {
                timeout: 10_000,
            });
            return;
        } catch {
            await page.reload({ waitUntil: 'domcontentloaded' });
        }
    }

    await expect(languageSwitcher).toContainText(expectedText, {
        timeout: 10_000,
    });
}

test.describe('Language Switching', () => {
    test(
        'switch to Spanish updates UI texts',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await switchLanguage(authenticatedPage, 'es', /espaÃ±ol|spanish|es/i);
        }
    );

    test(
        'switch to English restores UI texts',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await switchLanguage(authenticatedPage, 'es', /espaÃ±ol|spanish|es/i);
            await switchLanguage(authenticatedPage, 'en', /english|inglÃ©s|en/i);
        }
    );

    test(
        'language preference persists after navigation',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await switchLanguage(authenticatedPage, 'es', /espaÃ±ol|spanish|es/i);

            await authenticatedPage.goto('/dashboard/objectives');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const switcherText = await authenticatedPage
                .getByTestId('language-switcher')
                .textContent();
            expect(switcherText).toMatch(/espaÃ±ol|spanish|es/i);

            await switchLanguage(authenticatedPage, 'en', /english|inglÃ©s|en/i);
        }
    );

    test(
        'language switcher shows active language',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
            await expect(languageSwitcher).toBeVisible({ timeout: 15000 });

            const text = await languageSwitcher.textContent();
            expect(text).toMatch(/english|espaÃ±ol/i);
        }
    );
});
