import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('admin panel: non-admin user is redirected away', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/admin-panel');
    await page.waitForLoadState('networkidle');

    // AdminLayoutGuard redirects non-admins to dashboard home with unauthorized.
    await expect(page).toHaveURL(/\/dashboard\/home\?error=unauthorized/);
});

test('admin panel: direct tab URLs also redirect for non-admin', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/admin-panel?tab=users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home\?error=unauthorized/);

    await page.goto('/dashboard/admin-panel?tab=audit');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home\?error=unauthorized/);

    await page.goto('/dashboard/admin-panel?tab=sessions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard\/home\?error=unauthorized/);
});
