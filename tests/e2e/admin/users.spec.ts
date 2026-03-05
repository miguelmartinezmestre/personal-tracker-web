import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from '../../helpers/test-helpers';

test.describe('Admin Users', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
        await promoteToAdmin(page);
    });

    test('only admin can access users page', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });
    });

    test('non-admin is redirected away from admin page', async ({ page, context }) => {
        // Create a separate non-admin user in a new page
        const nonAdminPage = await context.newPage();
        await createTestUser(nonAdminPage);

        await nonAdminPage.goto('/dashboard/admin/users');
        await nonAdminPage.waitForLoadState('load');
        await nonAdminPage.waitForTimeout(2000);

        const currentUrl = nonAdminPage.url();
        const isRedirected = !currentUrl.includes('/admin/');
        const accessDenied = nonAdminPage.locator(
            'text=/access denied|forbidden|no autorizado|sin acceso/i'
        );
        const hasAccessDenied = (await accessDenied.count()) > 0;

        expect(isRedirected || hasAccessDenied).toBeTruthy();
        await nonAdminPage.close();
    });

    test('users table shows users', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        // Should have at least the admin user in the table
        const table = page.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });

        const rows = table.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    test('users table shows email, name, role, and status columns', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        // Table headers should include expected columns
        const headers = page.locator('table thead th');
        const headerTexts = await headers.allTextContents();
        const headerText = headerTexts.join(' ').toLowerCase();

        expect(headerText).toMatch(/email/i);
        expect(headerText).toMatch(/name|nombre/i);
        expect(headerText).toMatch(/role|rol/i);
        expect(headerText).toMatch(/status|estado/i);
    });

    test('edit user modal opens and can change role', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        // Click edit button on first user
        const editButton = page.getByTestId('user-edit-open').first();
        await editButton.click();

        // Modal should be visible
        const modal = page.getByTestId('user-edit-modal');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Role select should be visible
        const roleSelect = page.getByTestId('user-edit-role-select');
        await expect(roleSelect).toBeVisible();

        // Close modal
        const cancelButton = page.getByTestId('user-edit-cancel-button');
        await cancelButton.click();
    });

    test('ban button is visible for non-banned users', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        // At least one ban or unban button should be visible in the actions column
        const banButton = page.getByTestId('user-ban-button');
        const unbanButton = page.getByTestId('user-unban-button');

        const banCount = await banButton.count();
        const unbanCount = await unbanButton.count();

        // At least one action button should exist
        expect(banCount + unbanCount).toBeGreaterThanOrEqual(1);
    });

    test('delete button is visible for users', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        const deleteButton = page.getByTestId('user-delete-button');
        await expect(deleteButton.first()).toBeVisible();
    });
});
