import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from './test-helpers';

test('admin panel: redirect for non-admin stays', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home/);
});

test('admin panel: admin can access users/sessions/audit', async ({ page }) => {
    await createTestUser(page);
    await promoteToAdmin(page);

    await page.goto('/dashboard/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('admin-users-title')).toBeVisible();

    await page.goto('/dashboard/admin/sessions');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('admin-sessions-title')).toBeVisible();

    await page.goto('/dashboard/admin/audit');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('admin-audit-title')).toBeVisible();
});
