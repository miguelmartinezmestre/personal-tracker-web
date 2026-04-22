import { test, expect } from '../../fixtures/test-base';

async function openLanguageMenu(page: import('@playwright/test').Page): Promise<void> {
    const languageSwitcher = page.getByTestId('language-switcher');
    await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
    await languageSwitcher.click();
}

async function switchLanguage(
    page: import('@playwright/test').Page,
    option: 'es' | 'en',
    expectedText: RegExp
): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await openLanguageMenu(page);
        const optionLocator = page.getByTestId(`language-option-${option}`);
        await expect(optionLocator).toBeVisible({ timeout: 5000 });
        await optionLocator.click();
        await page.waitForLoadState('domcontentloaded');

        try {
            await expect(page.getByTestId('language-switcher')).toContainText(expectedText, {
                timeout: 5000,
            });
            return;
        } catch {
            await page.reload({ waitUntil: 'domcontentloaded' });
        }
    }

    await expect(page.getByTestId('language-switcher')).toContainText(expectedText, {
        timeout: 5000,
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
