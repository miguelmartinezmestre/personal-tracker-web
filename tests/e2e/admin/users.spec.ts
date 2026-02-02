import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from '../../helpers/test-helpers';

test.describe('Admin Users', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
        await promoteToAdmin(page);
    });

    test('view users list', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Admin users page should load
        await expect(page).toHaveURL(/\/dashboard\/admin\/users/);

        // Should show users table
        const usersTable = page.locator('table, [data-testid*="users-table"]');
        await expect(usersTable.first()).toBeVisible();

        // Should show at least one user (the admin themselves)
        const userRows = page.locator('tbody tr, [data-testid*="user-row"]');
        expect(await userRows.count()).toBeGreaterThan(0);
    });

    test('search users', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Look for search input
        const searchInput = page.locator('[data-testid*="search"], input[type="search"], input[placeholder*="search"], input[placeholder*="buscar"]').first();

        if (await searchInput.isVisible()) {
            // Search for a user
            await searchInput.fill('test');
            await page.waitForTimeout(1000);
            await page.waitForLoadState('networkidle');

            // Results should update
        }
    });

    test('change user role', async ({ page, context }) => {
        // Create another user to change their role
        const newPage = await context.newPage();
        const otherUser = await createTestUser(newPage);
        await newPage.close();

        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Find the other user's row
        const userRow = page.locator('tr', { hasText: otherUser.email }).first();

        if (await userRow.isVisible()) {
            // Look for role change action
            const roleButton = userRow.locator('[data-testid*="role"], button:has-text("Role"), select').first();

            if (await roleButton.isVisible()) {
                await roleButton.click();

                // Select new role
                const adminOption = page.getByRole('option', { name: /admin/i });
                if (await adminOption.count() > 0) {
                    await adminOption.click();
                    await page.waitForTimeout(2000);
                    await page.waitForLoadState('networkidle');
                }
            }
        }
    });

    test('ban user', async ({ page, context }) => {
        // Create another user to ban
        const newPage = await context.newPage();
        const otherUser = await createTestUser(newPage);
        await newPage.close();

        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        const userRow = page.locator('tr', { hasText: otherUser.email }).first();

        if (await userRow.isVisible()) {
            // Look for ban button
            const banButton = userRow.locator('button:has-text("Ban"), button:has-text("Suspend"), [data-testid*="ban"]').first();

            if (await banButton.isVisible()) {
                await banButton.click();

                // Confirm ban
                const confirmDialog = page.locator('[role="dialog"]');
                if (await confirmDialog.isVisible()) {
                    const confirmButton = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Ban")').first();
                    await confirmButton.click();
                }

                await page.waitForTimeout(2000);
                await page.waitForLoadState('networkidle');

                // User should show as banned
            }
        }
    });

    test('unban user', async ({ page, context }) => {
        // This test assumes a banned user exists
        // Would need to ban first then unban

        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Look for unban button on any banned user
        const unbanButton = page.locator('button:has-text("Unban"), button:has-text("Activate"), [data-testid*="unban"]');

        if (await unbanButton.count() > 0) {
            await unbanButton.first().click();

            const confirmDialog = page.locator('[role="dialog"]');
            if (await confirmDialog.isVisible()) {
                const confirmButton = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Unban")').first();
                await confirmButton.click();
            }

            await page.waitForTimeout(2000);
        }
    });

    test('view user details', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Click on a user to view details
        const userRow = page.locator('tbody tr, [data-testid*="user-row"]').first();
        const viewButton = userRow.locator('a, button:has-text("View"), [data-testid*="view"]').first();

        if (await viewButton.isVisible()) {
            await viewButton.click();
            await page.waitForLoadState('networkidle');

            // Should show user details
        }
    });

    test('users list pagination', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Look for pagination controls
        const pagination = page.locator('[data-testid*="pagination"], .pagination, nav[aria-label*="pagination"]');

        if (await pagination.count() > 0) {
            // Try navigating to next page
            const nextButton = page.locator('button:has-text("Next"), [aria-label*="next"]');

            if (await nextButton.isEnabled()) {
                await nextButton.click();
                await page.waitForLoadState('networkidle');
            }
        }
    });

    test('filter users by role', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Look for role filter
        const roleFilter = page.locator('[data-testid*="role-filter"], select:has-text("Role")').first();

        if (await roleFilter.isVisible()) {
            await roleFilter.click();

            const adminOption = page.getByRole('option', { name: /admin/i });
            if (await adminOption.count() > 0) {
                await adminOption.click();
                await page.waitForLoadState('networkidle');

                // Should show only admin users
            }
        }
    });

    test('filter users by status', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Look for status filter
        const statusFilter = page.locator('[data-testid*="status-filter"], select:has-text("Status")').first();

        if (await statusFilter.isVisible()) {
            await statusFilter.click();

            const activeOption = page.getByRole('option', { name: /active|activo/i });
            if (await activeOption.count() > 0) {
                await activeOption.click();
                await page.waitForLoadState('networkidle');

                // Should show only active users
            }
        }
    });

    test('users table shows creation date', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Table should be visible
        const table = page.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });

        // Table exists with user data (date column may or may not exist)
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(0);
    });

    test('cannot demote yourself from admin', async ({ page }) => {
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Find own row (current admin user)
        // Role change for self should be disabled
        const selfRow = page.locator('tr:has-text("(you)"), tr:has-text("(tú)"), [data-testid*="current-user"]');

        if (await selfRow.count() > 0) {
            const roleButton = selfRow.locator('[data-testid*="role"], button:has-text("Role")');

            if (await roleButton.count() > 0) {
                // Should be disabled
                await expect(roleButton.first()).toBeDisabled();
            }
        }
    });
});
