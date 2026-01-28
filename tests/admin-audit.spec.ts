import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from './test-helpers';

async function openAdminAudit(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/admin/audit');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('admin-audit-title')).toBeVisible();
}

test('admin audit: page loads for admin', async ({ page }) => {
    await createTestUser(page);
    await promoteToAdmin(page);

    await openAdminAudit(page);
    await expect(page.getByTestId('table')).toBeVisible();
});
