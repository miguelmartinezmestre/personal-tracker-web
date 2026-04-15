import { test, expect } from '../../fixtures/test-base';

test.describe('Language Switching', () => {
    test(
        'switch to Spanish updates UI texts',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
            await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
            await languageSwitcher.click();

            const spanishOption = authenticatedPage.getByTestId('language-option-es');
            await expect(spanishOption).toBeVisible();
            await spanishOption.click();

            await authenticatedPage.waitForLoadState('domcontentloaded');
            await expect(authenticatedPage.getByTestId('language-switcher')).toContainText(
                /español/i,
                { timeout: 5000 }
            );
        }
    );

    test(
        'switch to English restores UI texts',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
            await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
            await languageSwitcher.click();

            const spanishOption = authenticatedPage.getByTestId('language-option-es');
            await expect(spanishOption).toBeVisible();
            await spanishOption.click();
            await authenticatedPage.waitForLoadState('domcontentloaded');
            await expect(authenticatedPage.getByTestId('language-switcher')).toContainText(
                /español/i,
                { timeout: 5000 }
            );

            await authenticatedPage.getByTestId('language-switcher').click();
            const englishOption = authenticatedPage.getByTestId('language-option-en');
            await expect(englishOption).toBeVisible();
            await englishOption.click();
            await authenticatedPage.waitForLoadState('domcontentloaded');
            await expect(authenticatedPage.getByTestId('language-switcher')).toContainText(
                /english/i,
                { timeout: 5000 }
            );
        }
    );

    test(
        'language preference persists after navigation',
        { tag: ['@REQ-NF-012'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
            await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
            await languageSwitcher.click();

            const spanishOption = authenticatedPage.getByTestId('language-option-es');
            await expect(spanishOption).toBeVisible();
            await spanishOption.click();
            await authenticatedPage.waitForLoadState('domcontentloaded');
            await expect(authenticatedPage.getByTestId('language-switcher')).toContainText(
                /español/i,
                { timeout: 5000 }
            );

            await authenticatedPage.goto('/dashboard/objectives');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            const switcherText = await authenticatedPage
                .getByTestId('language-switcher')
                .textContent();
            expect(switcherText).toMatch(/español/i);

            await authenticatedPage.getByTestId('language-switcher').click();
            const englishOption = authenticatedPage.getByTestId('language-option-en');
            await expect(englishOption).toBeVisible();
            await englishOption.click();
            await authenticatedPage.waitForLoadState('domcontentloaded');
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
            expect(text).toMatch(/english|español/i);
        }
    );
});
