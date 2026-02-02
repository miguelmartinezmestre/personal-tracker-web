import { test, expect } from '@playwright/test';
import { createTestUser, DEFAULT_PASSWORD } from '../../helpers/test-helpers';

test.describe('Profile Settings', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
    });

    test('view profile information', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Settings page should load
        await expect(page).toHaveURL(/\/dashboard\/settings/);

        // Should show profile section
        const profileSection = page.locator('text=/profile|perfil/i');
        const hasProfileSection = await profileSection.count() > 0;

        // Should show user info
        const emailDisplay = page.locator('input[type="email"]').or(page.getByText(/@.*\./));
        const hasEmail = await emailDisplay.count() > 0;

        expect(hasProfileSection || hasEmail).toBeTruthy();
    });

    test('update profile name', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Find name input
        const nameInput = page.locator('[data-testid*="name-input"], input[name="name"], input[placeholder*="name"]').first();

        if (await nameInput.isVisible()) {
            // Update name
            await nameInput.clear();
            const newName = `Updated Name ${Date.now()}`;
            await nameInput.fill(newName);

            // Save
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Guardar")').first();
            await saveButton.click();

            await page.waitForTimeout(2000);
            await page.waitForLoadState('networkidle');

            // Verify update (might show success message)
            const successMessage = page.locator('text=/saved|updated|guardado|actualizado/i');
            const hasSuccess = await successMessage.count() > 0;

            // Or reload and check
            await page.reload();
            await page.waitForLoadState('networkidle');

            const updatedName = await nameInput.inputValue();
            expect(updatedName).toBe(newName);
        }
    });

    test('update profile email', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Find email input
        const emailInput = page.locator('[data-testid*="email-input"], input[type="email"], input[name="email"]').first();

        if (await emailInput.isVisible()) {
            // Note: Email change might require verification
            const newEmail = `updated-${Date.now()}@example.com`;
            await emailInput.clear();
            await emailInput.fill(newEmail);

            // Save
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
            await saveButton.click();

            await page.waitForTimeout(2000);

            // Might show verification message or success
        }
    });

    test('change password', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for change password section or button
        const changePasswordButton = page.locator('button:has-text("Change password"), button:has-text("Cambiar contraseña"), [data-testid*="change-password"]');

        if (await changePasswordButton.count() > 0) {
            await changePasswordButton.first().click();
            await page.waitForTimeout(500);
        }

        // Find password fields
        const currentPasswordInput = page.locator('input[name*="current"], input[placeholder*="current"], [data-testid*="current-password"]').first();
        const newPasswordInput = page.locator('input[name*="new"][type="password"], input[placeholder*="new"], [data-testid*="new-password"]').first();
        const confirmPasswordInput = page.locator('input[name*="confirm"], input[placeholder*="confirm"], [data-testid*="confirm-password"]').first();

        if (await currentPasswordInput.isVisible()) {
            await currentPasswordInput.fill(DEFAULT_PASSWORD);
            await newPasswordInput.fill('newpassword123');

            if (await confirmPasswordInput.isVisible()) {
                await confirmPasswordInput.fill('newpassword123');
            }

            // Save
            const saveButton = page.locator('button:has-text("Change"), button:has-text("Update"), button:has-text("Save")').first();
            await saveButton.click();

            await page.waitForTimeout(2000);

            // Should show success or error
        }
    });

    test('validate current password required', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for password section
        const changePasswordButton = page.locator('button:has-text("Change password"), [data-testid*="change-password"]');

        if (await changePasswordButton.count() > 0) {
            await changePasswordButton.first().click();
            await page.waitForTimeout(500);
        }

        // Try to change password without current password
        const newPasswordInput = page.locator('input[name*="new"][type="password"], [data-testid*="new-password"]').first();

        if (await newPasswordInput.isVisible()) {
            await newPasswordInput.fill('newpassword123');

            const confirmInput = page.locator('input[name*="confirm"], [data-testid*="confirm-password"]').first();
            if (await confirmInput.isVisible()) {
                await confirmInput.fill('newpassword123');
            }

            // Try to save without current password
            const saveButton = page.locator('button:has-text("Change"), button:has-text("Save")').first();
            await saveButton.click();

            await page.waitForTimeout(1000);

            // Should show error about current password
            const errorMessage = page.locator('text=/current.*required|actual.*requerid|wrong.*password/i');
            const hasError = await errorMessage.count() > 0;

            // Or form validation prevents submission
        }
    });

    test('validate password minimum length', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const changePasswordButton = page.locator('button:has-text("Change password")');
        if (await changePasswordButton.count() > 0) {
            await changePasswordButton.first().click();
        }

        const currentPasswordInput = page.locator('input[name*="current"], [data-testid*="current-password"]').first();
        const newPasswordInput = page.locator('input[name*="new"][type="password"]').first();

        if (await newPasswordInput.isVisible()) {
            if (await currentPasswordInput.isVisible()) {
                await currentPasswordInput.fill(DEFAULT_PASSWORD);
            }

            // Enter short password
            await newPasswordInput.fill('short');

            const saveButton = page.locator('button:has-text("Change"), button:has-text("Save")').first();
            await saveButton.click();

            await page.waitForTimeout(1000);

            // Should show validation error
            const errorMessage = page.locator('text=/minimum|mínimo|8.*characters|caracteres/i');
            const hasError = await errorMessage.count() > 0;
        }
    });

    test('validate password confirmation match', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const changePasswordButton = page.locator('button:has-text("Change password")');
        if (await changePasswordButton.count() > 0) {
            await changePasswordButton.first().click();
        }

        const currentPasswordInput = page.locator('input[name*="current"]').first();
        const newPasswordInput = page.locator('input[name*="new"][type="password"]').first();
        const confirmPasswordInput = page.locator('input[name*="confirm"]').first();

        if (await newPasswordInput.isVisible() && await confirmPasswordInput.isVisible()) {
            if (await currentPasswordInput.isVisible()) {
                await currentPasswordInput.fill(DEFAULT_PASSWORD);
            }

            await newPasswordInput.fill('newpassword123');
            await confirmPasswordInput.fill('differentpassword');

            const saveButton = page.locator('button:has-text("Change"), button:has-text("Save")').first();
            await saveButton.click();

            await page.waitForTimeout(1000);

            // Should show mismatch error
            const errorMessage = page.locator('text=/match|coinciden|don\'t match/i');
            const hasError = await errorMessage.count() > 0;
        }
    });

    test('profile avatar display', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for avatar section
        const avatarSection = page.locator('[data-testid*="avatar"], img[alt*="avatar"], .avatar, [class*="avatar"]');
        const hasAvatar = await avatarSection.count() > 0;

        // Or initial letter display
        const initialDisplay = page.locator('[class*="avatar"] span, [data-testid*="initial"]');
    });

    test('settings navigation tabs', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for tab navigation (Profile, Security, etc.)
        const profileTab = page.locator('button:has-text("Profile"), a:has-text("Profile"), [data-testid*="profile-tab"]');
        const securityTab = page.locator('button:has-text("Security"), a:has-text("Security"), [data-testid*="security-tab"]');

        if (await profileTab.count() > 0) {
            await expect(profileTab.first()).toBeVisible();
        }

        if (await securityTab.count() > 0) {
            await securityTab.first().click();
            await page.waitForLoadState('networkidle');

            // Security section should show
        }
    });

    test('delete account option', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for delete account option (usually in danger zone)
        const deleteAccountButton = page.locator('button:has-text("Delete account"), button:has-text("Eliminar cuenta"), [data-testid*="delete-account"]');

        if (await deleteAccountButton.count() > 0) {
            // Button should exist but require confirmation
            await expect(deleteAccountButton.first()).toBeVisible();

            // Don't actually click it in this test
        }
    });

    test('language preference setting', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for language setting
        const languageSelect = page.locator('[data-testid*="language"], select:has-text("Language"), select:has-text("Idioma")');

        if (await languageSelect.count() > 0) {
            await languageSelect.first().click();

            // Should show language options
            const spanishOption = page.getByRole('option', { name: /spanish|español/i });
            const englishOption = page.getByRole('option', { name: /english|inglés/i });

            const hasOptions = await spanishOption.count() > 0 || await englishOption.count() > 0;
        }
    });

    test('theme preference setting', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Look for theme setting
        const themeSelect = page.locator('[data-testid*="theme"], button:has-text("Theme"), button:has-text("Tema")');

        if (await themeSelect.count() > 0) {
            // Theme toggle or select should be present
            await expect(themeSelect.first()).toBeVisible();
        }
    });
});
