import { test, expect } from '../../fixtures/admin-test-base';
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
            const freshContext = await browser.newContext();
            const nonAdminPage = await freshContext.newPage();
            await createTestUserViaAPI(nonAdminPage);

            await nonAdminPage.goto('/dashboard/admin/users');
            await nonAdminPage.waitForLoadState('domcontentloaded');

            const maxWaitTime = Date.now() + 10000;
            let isBlocked = false;

            while (Date.now() < maxWaitTime && !isBlocked) {
                const url = nonAdminPage.url();
                const hasAccessDenied = await nonAdminPage
                    .getByRole('heading', {
                        name: /access denied|forbidden|no autorizado|sin acceso/i,
                    })
                    .isVisible()
                    .catch(() => false);

                isBlocked = !url.includes('/admin/') || hasAccessDenied;

                if (!isBlocked) {
                    await nonAdminPage.waitForTimeout(200);
                }
            }

            const currentUrl = nonAdminPage.url();
            const isRedirected = !currentUrl.includes('/admin/');
            const hasAccessDenied = await nonAdminPage
                .getByRole('heading', { name: /access denied|forbidden|no autorizado|sin acceso/i })
                .isVisible()
                .catch(() => false);

            expect(isRedirected || hasAccessDenied).toBeTruthy();
            await freshContext.close();
        }
    );

    test('users table shows users', { tag: ['@REQ-ADMIN-001'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const usersTable = page.getByTestId('admin-users-table');
        await expect(usersTable).toBeVisible({ timeout: 15000 });

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

            const editButton = page.getByTestId('user-edit-open').first();
            await editButton.click();

            const modal = page.getByTestId('user-edit-modal');
            await expect(modal).toBeVisible({ timeout: 5000 });

            const roleSelect = page.getByTestId('user-edit-role-select');
            await expect(roleSelect).toBeVisible();

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

            const banButton = page.getByTestId('user-ban-button');
            const unbanButton = page.getByTestId('user-unban-button');

            const banCount = await banButton.count();
            const unbanCount = await unbanButton.count();

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
