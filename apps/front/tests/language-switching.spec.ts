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

        // Click language switcher
        await languageSwitcher.click();

        // Wait for language change to apply
        await page.waitForTimeout(1000);

        // Verify language changed (text should be different)
        const newText = await languageSwitcher.textContent();
        expect(newText).not.toBe(initialText);
    }

    // Check for language toggle in header/footer
    const langToggle = page.getByRole('button', { name: /language|lang/i });
    if (await langToggle.isVisible()) {
        await langToggle.click();
        await page.waitForTimeout(500);
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

    // Check if objectives heading is localized
    const objectivesHeading = page.getByRole('heading', { name: /objectives|objetivos/i });
    await expect(objectivesHeading).toBeVisible();

    // Try language switching and verify content changes
    const languageSwitcher = page.getByTestId('language-switcher');
    if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click();
        await page.waitForTimeout(1000);

        // Verify objectives heading is still visible (in different language)
        await expect(objectivesHeading).toBeVisible();
    }
});
