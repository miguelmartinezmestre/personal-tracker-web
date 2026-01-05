import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('dashboard shell: theme switcher toggles theme', async ({ page }) => {
    await createTestUser(page);

    const themeToggle = page.getByRole('button', { name: /change theme/i });
    await themeToggle.click();
    await page.getByRole('menuitem', { name: /dark/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await themeToggle.click();
    await page.getByRole('menuitem', { name: /light/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('dashboard shell: command menu navigates to objectives', async ({ page }) => {
    await createTestUser(page);

    await page.waitForLoadState('networkidle');
    const input = page.getByPlaceholder(/search commands/i);
    const dialog = page.locator('[data-slot="dialog-content"]');

    const openWithDispatch = async () => {
        await page.evaluate(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'k',
                    code: 'KeyK',
                    ctrlKey: true,
                    metaKey: true,
                    bubbles: true,
                    cancelable: true,
                })
            );
        });
    };

    const tryOpen = async () => {
        await openWithDispatch();
        try {
            await expect(input).toBeVisible({ timeout: 2000 });
            return true;
        } catch {
            return false;
        }
    };

    if (!(await tryOpen())) {
        await page.click('body');
        await page.keyboard.press('Control+K');
        await expect(input).toBeVisible({ timeout: 5000 });
    }

    await expect(dialog).toBeVisible();
    await input.fill('objectives');
    await dialog.getByRole('option', { name: /objectives/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/objectives$/);
});

test('dashboard shell: non-admin is redirected with unauthorized alert', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/admin-panel');
    await expect(page).toHaveURL(/\/dashboard\/home\?error=unauthorized/);
    await expect(page.getByText(/access denied/i)).toBeVisible();
});

test('dashboard shell: settings modal opens from sidebar', async ({ page }) => {
    await createTestUser(page);

    await page.getByRole('button', { name: /^settings$/i }).click();
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible();

    await page.getByRole('tab', { name: /password/i }).click();
    await expect(page.getByLabel(/new password/i)).toBeVisible();
});
