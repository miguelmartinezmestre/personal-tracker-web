import { test, expect } from '../../fixtures/test-base';

test.describe('Command Palette', () => {
    test(
        'Cmd+K opens the palette, the filter narrows it and choosing with the keyboard navigates',
        { tag: ['@REQ-NF-012', '@INH-ACC-03'] },
        async ({ page }) => {
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('command-menu-ready')).toBeAttached({ timeout: 10000 });
            await page.keyboard.press('Meta+k');
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

            await page.getByTestId('command-input').fill('organiz');
            await expect(page.getByTestId('command-item-organizations')).toBeVisible();
            await expect(page.getByTestId('command-item-home')).toBeHidden();
            await page.keyboard.press('Enter');

            await page.waitForURL(/\/dashboard\/organizations/, { timeout: 10000 });
            await expect(page.getByRole('dialog')).toBeHidden();
        }
    );
});
