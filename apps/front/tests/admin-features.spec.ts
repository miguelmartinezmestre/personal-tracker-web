import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('admin panel: direct tab URLs also redirect for non-admin', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home/);

    await page.goto('/dashboard/admin/audit');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home/);

    await page.goto('/dashboard/admin/sessions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home/);
});
