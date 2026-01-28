import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from './test-helpers';

async function openAdminSessions(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/admin/sessions');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('admin-sessions-title')).toBeVisible();
}

test('admin sessions: page loads for admin', async ({ page }) => {
    await createTestUser(page);
    await promoteToAdmin(page);

    await openAdminSessions(page);
    await expect(page.getByTestId('user-sessions-userid-input')).toBeVisible();
});

test('admin sessions: empty state without user id', async ({ page }) => {
    await createTestUser(page);
    await promoteToAdmin(page);

    await openAdminSessions(page);
    await expect(page.getByText(/user id/i)).toBeVisible();
});
