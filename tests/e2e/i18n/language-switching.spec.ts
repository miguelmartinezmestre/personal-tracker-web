import { test, expect } from '../../fixtures/test-base';

test.describe('Language Switching', () => {
    test('switch to Spanish updates UI texts', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        // Click language switcher
        const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
        await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
        await languageSwitcher.click();

        // Select Spanish
        const spanishOption = authenticatedPage.getByTestId('language-option-es');
        await expect(spanishOption).toBeVisible();
        await spanishOption.click();

        // Wait for page to refresh with new locale
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // UI should now show Spanish text - check sidebar or header
        // The language switcher should now show "Español"
        const switcherText = await authenticatedPage.getByTestId('language-switcher').textContent();
        expect(switcherText).toMatch(/español/i);
    });

    test('switch to English restores UI texts', async ({ authenticatedPage }) => {
        // First set to Spanish
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
        await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
        await languageSwitcher.click();

        const spanishOption = authenticatedPage.getByTestId('language-option-es');
        await expect(spanishOption).toBeVisible();
        await spanishOption.click();
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Now switch back to English
        await authenticatedPage.getByTestId('language-switcher').click();
        const englishOption = authenticatedPage.getByTestId('language-option-en');
        await expect(englishOption).toBeVisible();
        await englishOption.click();
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Should show English text
        const switcherText = await authenticatedPage.getByTestId('language-switcher').textContent();
        expect(switcherText).toMatch(/english/i);
    });

    test('language preference persists after navigation', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        // Switch to Spanish
        const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
        await expect(languageSwitcher).toBeVisible({ timeout: 15000 });
        await languageSwitcher.click();

        const spanishOption = authenticatedPage.getByTestId('language-option-es');
        await expect(spanishOption).toBeVisible();
        await spanishOption.click();
        await authenticatedPage.waitForLoadState('domcontentloaded');
        await authenticatedPage.waitForTimeout(1000);

        // Navigate to objectives page
        await authenticatedPage.goto('/dashboard/objectives');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        // Language should still be Spanish
        const switcherText = await authenticatedPage.getByTestId('language-switcher').textContent();
        expect(switcherText).toMatch(/español/i);

        // Clean up: switch back to English
        await authenticatedPage.getByTestId('language-switcher').click();
        const englishOption = authenticatedPage.getByTestId('language-option-en');
        await expect(englishOption).toBeVisible();
        await englishOption.click();
        await authenticatedPage.waitForLoadState('domcontentloaded');
    });

    test('language switcher shows active language', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        const languageSwitcher = authenticatedPage.getByTestId('language-switcher');
        await expect(languageSwitcher).toBeVisible({ timeout: 15000 });

        // Switcher should show current language (either English or Español)
        const text = await languageSwitcher.textContent();
        expect(text).toMatch(/english|español/i);
    });
});
