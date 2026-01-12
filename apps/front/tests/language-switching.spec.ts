import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('language switching: toggle between languages', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Check if language switcher is available
    const languageSwitcher = page.getByTestId('language-switcher');
    if (await languageSwitcher.isVisible()) {
        // Get initial language text
        const initialText = await languageSwitcher.textContent();

        // Click language switcher to open the dropdown
        await languageSwitcher.click();

        // Wait for dropdown to appear
        await page.waitForTimeout(300);

        // Click on the opposite language option
        // If current is English, click Spanish; if Spanish, click English
        if (initialText?.includes('English')) {
            await page.getByTestId('language-option-es').click();
        } else {
            await page.getByTestId('language-option-en').click();
        }

        // Wait for language change to apply
        await page.waitForTimeout(1000);

        // Verify language changed (text should be different)
        const newText = await languageSwitcher.textContent();
        expect(newText).not.toBe(initialText);
    }
});

test('language switching: verify localized content', async ({ page }) => {
    // Register and login
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);

    // Navigate to objectives page
    await page.goto('/dashboard/objectives');
    await page.waitForLoadState('networkidle');

    // Check if objectives heading is visible (h1 with "Objectives" or "Objetivos")
    const objectivesHeading = page.locator('h1');
    await expect(objectivesHeading).toBeVisible();
    const initialHeadingText = await objectivesHeading.textContent();

    // Try language switching and verify content changes
    const languageSwitcher = page.getByTestId('language-switcher');
    if (await languageSwitcher.isVisible()) {
        // Open dropdown
        await languageSwitcher.click();
        await page.waitForTimeout(300);

        // Click on the opposite language option
        if (initialHeadingText?.toLowerCase().includes('objectives')) {
            await page.getByTestId('language-option-es').click();
        } else {
            await page.getByTestId('language-option-en').click();
        }
        await page.waitForTimeout(1000);

        // Verify heading text changed
        const newHeadingText = await objectivesHeading.textContent();
        expect(newHeadingText).not.toBe(initialHeadingText);
    }
});
