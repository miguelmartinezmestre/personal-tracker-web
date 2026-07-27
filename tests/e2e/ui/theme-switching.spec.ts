import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test-base';

async function selectTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
    await page.getByTestId('dashboard-theme-toggle').first().click();
    const option = page.getByTestId(`theme-option-${theme}`).first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
}

test('theme preference changes and persists after reload', async ({ page }) => {
    await page.goto('/dashboard/home');
    await selectTheme(page, 'dark');
    await expect(page.locator('html')).toHaveAttribute('class', /dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('class', /dark/);

    await selectTheme(page, 'light');
    await expect.poll(() => page.locator('html').getAttribute('class')).not.toContain('dark');
});
