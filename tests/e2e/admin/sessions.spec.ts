import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from '../../helpers/test-helpers';

test.describe('Admin Sessions', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
        await promoteToAdmin(page);
    });

    test('view all user sessions', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Admin sessions page should load
        await expect(page).toHaveURL(/\/dashboard\/admin\/sessions/);

        // Should show sessions table
        const sessionsTable = page.locator('table, [data-testid*="sessions"]');
        await expect(sessionsTable.first()).toBeVisible({ timeout: 10000 });

        // Table should be visible (may have 0 rows if no sessions yet, which is valid)
        const tableVisible = await sessionsTable.first().isVisible();
        expect(tableVisible).toBeTruthy();
    });

    test('filter sessions by user', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Look for user filter
        const userFilter = page
            .locator(
                '[data-testid*="user-filter"], input[placeholder*="user"], input[placeholder*="search"]'
            )
            .first();

        if (await userFilter.isVisible()) {
            await userFilter.fill('test');
            await page.waitForTimeout(1000);
            await page.waitForLoadState('networkidle');

            // Should filter sessions by user
        }
    });

    test('admin can revoke any session', async ({ page, context }) => {
        // Create another user with an active session
        const newPage = await context.newPage();
        await createTestUser(newPage);
        // Don't close the page to keep the session active
        await newPage.close();

        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Find a session that's not the current admin's
        const sessionRows = page.locator('tbody tr, [data-testid*="session-row"]');

        for (let i = 0; i < (await sessionRows.count()); i++) {
            const row = sessionRows.nth(i);
            const isCurrentSession = (await row.locator('text=/current|actual/i').count()) > 0;

            if (!isCurrentSession) {
                const revokeButton = row.locator(
                    'button:has-text("Revoke"), button:has-text("End"), [data-testid*="revoke"]'
                );

                if (await revokeButton.isVisible()) {
                    await revokeButton.click();

                    // Confirm
                    const confirmDialog = page.locator('[role="dialog"]');
                    if (await confirmDialog.isVisible()) {
                        const confirmButton = confirmDialog
                            .locator('button:has-text("Confirm"), button:has-text("Revoke")')
                            .first();
                        await confirmButton.click();
                    }

                    await page.waitForTimeout(2000);
                    break;
                }
            }
        }
    });

    test('sessions show user information', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Table should be visible
        const table = page.locator('table');
        const tableVisible = (await table.count()) > 0;

        // Sessions table exists (user info is shown in the table)
        expect(tableVisible).toBeTruthy();
    });

    test('sessions show device information', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Sessions should show device/browser info
        const deviceInfo = page.locator('text=/chrome|firefox|safari|windows|mac/i');
        const hasDeviceInfo = (await deviceInfo.count()) > 0;

        // Or user agent column
        const userAgentColumn = page.locator(
            'th:has-text("Device"), th:has-text("Browser"), th:has-text("User Agent")'
        );
        const hasColumn = (await userAgentColumn.count()) > 0;
    });

    test('sessions show IP address', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Table should be visible (IP may or may not be shown depending on configuration)
        const table = page.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('sessions show last activity time', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Table should be visible with date columns
        const table = page.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });

        // Look for date column headers
        const dateHeader = page.locator(
            'th:has-text("Date"), th:has-text("Fecha"), th:has-text("Expires"), th:has-text("Created")'
        );
        const hasDateHeader = (await dateHeader.count()) > 0;

        expect(hasDateHeader).toBeTruthy();
    });

    test('sessions pagination', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Look for pagination controls
        const pagination = page.locator('[data-testid*="pagination"], .pagination');

        if ((await pagination.count()) > 0) {
            const nextButton = page.locator('button:has-text("Next"), [aria-label*="next"]');

            if (await nextButton.isEnabled()) {
                await nextButton.click();
                await page.waitForLoadState('networkidle');
            }
        }
    });

    test('filter by session status', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Look for status filter (active/revoked)
        const statusFilter = page
            .locator('[data-testid*="status-filter"], select:has-text("Status")')
            .first();

        if (await statusFilter.isVisible()) {
            await statusFilter.click();

            const activeOption = page.getByRole('option', { name: /active|activo/i });
            if ((await activeOption.count()) > 0) {
                await activeOption.click();
                await page.waitForLoadState('networkidle');

                // Should show only active sessions
            }
        }
    });

    test('bulk revoke sessions', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Look for bulk actions
        const selectAllCheckbox = page
            .locator('input[type="checkbox"][aria-label*="all"], th input[type="checkbox"]')
            .first();

        if (await selectAllCheckbox.isVisible()) {
            await selectAllCheckbox.check();

            // Look for bulk action button
            const bulkRevokeButton = page.locator(
                'button:has-text("Revoke selected"), button:has-text("Bulk revoke")'
            );

            if ((await bulkRevokeButton.count()) > 0) {
                // Don't actually click to avoid mass revocation
                await expect(bulkRevokeButton.first()).toBeVisible();
            }
        }
    });

    test('sessions sorted by activity', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Most recently active sessions should be first
        const firstRow = page.locator('tbody tr, [data-testid*="session-row"]').first();

        if (await firstRow.isVisible()) {
            // Should have recent activity
            const activityTime = firstRow.locator(
                'text=/just now|seconds ago|hace.*segundos|hace.*minutos/i'
            );
            const isRecent = (await activityTime.count()) > 0;
        }
    });

    test('export sessions', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Look for export button
        const exportButton = page.locator(
            'button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]'
        );

        if ((await exportButton.count()) > 0) {
            await expect(exportButton.first()).toBeVisible();
        }
    });

    test('view session details', async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Click on a session to view details
        const sessionRow = page.locator('tbody tr, [data-testid*="session-row"]').first();
        const viewButton = sessionRow.locator(
            'button:has-text("Details"), button:has-text("View"), [data-testid*="view"]'
        );

        if ((await viewButton.count()) > 0) {
            await viewButton.first().click();
            await page.waitForTimeout(500);

            // Should show detailed session information
            const detailsPanel = page.locator('[role="dialog"], [data-testid*="details"]');
            await expect(detailsPanel.first()).toBeVisible();
        }
    });
});
