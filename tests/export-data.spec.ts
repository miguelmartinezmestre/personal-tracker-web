import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

async function openExportMenu(page: import('@playwright/test').Page) {
    const trigger = page.getByTestId('table-export-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByTestId('table-export-menu')).toBeVisible();
}

test('export: objectives table allows CSV/XLSX export', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/objectives');
    await page.waitForLoadState('networkidle');

    await openExportMenu(page);
    await expect(page.getByTestId('table-export-csv')).toBeVisible();
    await expect(page.getByTestId('table-export-xlsx')).toBeVisible();
});
