import { expect, type Page } from '@playwright/test';

export async function createCategory(page: Page, name: string) {
    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('category-create-open').click();
    await page.getByTestId('category-name-input').fill(name);
    await page.getByTestId('category-icon-select').click();
    await page.getByRole('option', { name: 'Star' }).click();
    await page.getByTestId('category-save-button').click();
    await expect(page.getByTestId('category-row').filter({ hasText: name })).toBeVisible({
        timeout: 15000,
    });
}
