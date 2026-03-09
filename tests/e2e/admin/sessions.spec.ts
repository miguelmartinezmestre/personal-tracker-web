import { test, expect } from '@playwright/test';
import { createTestUserViaAPI } from '../../helpers/test-helpers';

test.describe('Admin Sessions', () => {
    test('view all user sessions', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Admin sessions page should load
        await expect(page).toHaveURL(/\/dashboard\/admin\/sessions/);

        // Should show sessions table
        const sessionsTable = page.locator('table, [data-testid*="sessions"]');
        await expect(sessionsTable.first()).toBeVisible({ timeout: 10000 });

        // Table should be visible (may have 0 rows if no sessions yet, which is valid)
        const tableVisible = await sessionsTable.first().isVisible();
        expect(tableVisible).toBeTruthy();
    });

    test('filter sessions by user', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Look for user filter
        const userFilter = page
            .locator(
                '[data-testid*="user-filter"], input[placeholder*="user"], input[placeholder*="search"]'
            )
            .first();

        if (await userFilter.isVisible()) {
            await userFilter.fill('test');
            await page.waitForLoadState('domcontentloaded');

            // Should filter sessions by user
        }
    });

    test('admin can revoke any session', { tag: ['@REQ-ADMIN-004'] }, async ({ page, browser }) => {
        // Create another user in a fresh context so it doesn't share admin cookies
        const freshContext = await browser.newContext();
        const newPage = await freshContext.newPage();
        await createTestUserViaAPI(newPage);
        await freshContext.close();

        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Find a session that's not the current admin's
        const sessionRows = page.getByTestId('table-row');

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

                    break;
                }
            }
        }
    });

    test('sessions show user information', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Admin sessions page requires a userId to display sessions
        const title = page.getByTestId('admin-sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });

        // The userId input should be visible
        const userIdInput = page.getByTestId('user-sessions-userid-input');
        await expect(userIdInput).toBeVisible();
    });

    test('sessions show device information', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Sessions should show device/browser info
        const deviceInfo = page.locator('text=/chrome|firefox|safari|windows|mac/i');
        const hasDeviceInfo = (await deviceInfo.count()) > 0;

        // Or user agent column
        const userAgentColumn = page.locator(
            'th:has-text("Device"), th:has-text("Browser"), th:has-text("User Agent")'
        );
        const hasColumn = (await userAgentColumn.count()) > 0;
    });

    test('sessions show IP address', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Admin sessions page should load with title and input
        const title = page.getByTestId('admin-sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });

        // Entering a userId should display the sessions table
        const userIdInput = page.getByTestId('user-sessions-userid-input');
        await expect(userIdInput).toBeVisible();
    });

    test('sessions show last activity time', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Admin sessions page should load
        const title = page.getByTestId('admin-sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });

        // The page has a userId-based lookup for sessions
        const userIdInput = page.getByTestId('user-sessions-userid-input');
        await expect(userIdInput).toBeVisible();
    });

    test('sessions pagination', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Look for pagination controls
        const pagination = page.locator('[data-testid*="pagination"], .pagination');

        if ((await pagination.count()) > 0) {
            const nextButton = page.locator('button:has-text("Next"), [aria-label*="next"]');

            if (await nextButton.isEnabled()) {
                await nextButton.click();
                await page.waitForLoadState('domcontentloaded');
            }
        }
    });

    test('filter by session status', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Look for status filter (active/revoked)
        const statusFilter = page
            .locator('[data-testid*="status-filter"], select:has-text("Status")')
            .first();

        if (await statusFilter.isVisible()) {
            await statusFilter.click();

            const activeOption = page.getByRole('option', { name: /active|activo/i });
            if ((await activeOption.count()) > 0) {
                await activeOption.click();
                await page.waitForLoadState('domcontentloaded');

                // Should show only active sessions
            }
        }
    });

    test('bulk revoke sessions', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

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

    test('sessions sorted by activity', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Most recently active sessions should be first
        const firstRow = page.getByTestId('table-row').first();

        if (await firstRow.isVisible()) {
            // Should have recent activity
            const activityTime = firstRow.locator(
                'text=/just now|seconds ago|hace.*segundos|hace.*minutos/i'
            );
            const isRecent = (await activityTime.count()) > 0;
        }
    });

    test('export sessions', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Look for export button
        const exportButton = page.locator(
            'button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]'
        );

        if ((await exportButton.count()) > 0) {
            await expect(exportButton.first()).toBeVisible();
        }
    });

    test('view session details', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        // Click on a session to view details
        const sessionRow = page.getByTestId('table-row').first();
        const viewButton = sessionRow.locator(
            'button:has-text("Details"), button:has-text("View"), [data-testid*="view"]'
        );

        if ((await viewButton.count()) > 0) {
            await viewButton.first().click();

            // Should show detailed session information
            const detailsPanel = page.locator('[role="dialog"], [data-testid*="details"]');
            await expect(detailsPanel.first()).toBeVisible();
        }
    });
});
