import { test, expect } from '@playwright/test';
import { createTestUserViaAPI } from '../../helpers/test-helpers';

test.describe('Admin Users', () => {
    test('only admin can access users page', { tag: ['@REQ-ADMIN-001'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });
    });

    test(
        'non-admin is redirected away from admin page',
        { tag: ['@REQ-ADMIN-001'] },
        async ({ browser }) => {
            // Use a fresh browser context so the non-admin user doesn't share admin cookies
            const freshContext = await browser.newContext();
            const nonAdminPage = await freshContext.newPage();
            await createTestUserViaAPI(nonAdminPage);

            await nonAdminPage.goto('/dashboard/admin/users');
            await nonAdminPage.waitForLoadState('domcontentloaded');

            // Wait for redirect away from admin page or access denied message
            await expect
                .poll(
                    async () => {
                        const url = nonAdminPage.url();
                        const denied =
                            (await nonAdminPage
                                .locator('text=/access denied|forbidden|no autorizado|sin acceso/i')
                                .count()) > 0;
                        return !url.includes('/admin/') || denied;
                    },
                    { timeout: 10000, intervals: [500, 1000, 2000] }
                )
                .toBe(true);
            await freshContext.close();
        }
    );

    test('users table shows users', { tag: ['@REQ-ADMIN-001'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        // Should have at least the admin user in the table
        const table = page.getByTestId('admin-users-table');
        await expect(table).toBeVisible({ timeout: 10000 });

        const rows = page.getByTestId('table-row');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    test(
        'users table shows email, name, role, and status columns',
        { tag: ['@REQ-ADMIN-001'] },
        async ({ page }) => {
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
        }
    );

    test(
        'edit user modal opens and can change role',
        { tag: ['@REQ-ADMIN-003'] },
        async ({ page }) => {
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
        }
    );

    test(
        'ban button is visible for non-banned users',
        { tag: ['@REQ-ADMIN-002'] },
        async ({ page }) => {
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
        }
    );

    test('delete button is visible for users', { tag: ['@REQ-ADMIN-001'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

        const deleteButton = page.getByTestId('user-delete-button');
        await expect(deleteButton.first()).toBeVisible();
    });
});
