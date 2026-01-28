import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from './test-helpers';

async function openAdminUsers(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('admin-users-title')).toBeVisible();
}

test('admin users: page loads for admin', async ({ page }) => {
    await createTestUser(page);
    await promoteToAdmin(page);

    await openAdminUsers(page);
    await expect(page.getByTestId('table')).toBeVisible();
});

test('admin users: edit role dialog opens', async ({ page }) => {
    await createTestUser(page);
    await promoteToAdmin(page);

    await openAdminUsers(page);

    const editButton = page.getByTestId('user-edit-open').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /save|guardar/i }).click();
});
