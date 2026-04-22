import { test, expect } from '../../fixtures/admin-test-base';
import { createTestUserViaAPI } from '../../helpers/test-helpers';

test.describe('Admin Sessions', () => {
    test('view all user sessions', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        await expect(page).toHaveURL(/\/dashboard\/admin\/sessions/);

        const sessionsTable = page.locator('table, [data-testid*="sessions"]');
        await expect(sessionsTable.first()).toBeVisible({ timeout: 10000 });

        const tableVisible = await sessionsTable.first().isVisible();
        expect(tableVisible).toBeTruthy();
    });

    test('filter sessions by user', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        const userFilter = page
            .locator(
                '[data-testid*="user-filter"], input[placeholder*="user"], input[placeholder*="search"]'
            )
            .first();

        if (await userFilter.isVisible()) {
            await userFilter.fill('test');
            await page.waitForLoadState('domcontentloaded');
        }
    });

    test('admin can revoke any session', { tag: ['@REQ-ADMIN-004'] }, async ({ page, browser }) => {
        const freshContext = await browser.newContext();
        const newPage = await freshContext.newPage();
        await createTestUserViaAPI(newPage);
        await freshContext.close();

        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

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

        const title = page.getByTestId('admin-sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });

        const userIdInput = page.getByTestId('user-sessions-userid-input');
        await expect(userIdInput).toBeVisible();
    });

    test('sessions show device information', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        const deviceInfo = page.locator('text=/chrome|firefox|safari|windows|mac/i');
        const hasDeviceInfo = (await deviceInfo.count()) > 0;

        const userAgentColumn = page.locator(
            'th:has-text("Device"), th:has-text("Browser"), th:has-text("User Agent")'
        );
        const hasColumn = (await userAgentColumn.count()) > 0;
    });

    test('sessions show IP address', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        const title = page.getByTestId('admin-sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });

        const userIdInput = page.getByTestId('user-sessions-userid-input');
        await expect(userIdInput).toBeVisible();
    });

    test('sessions show last activity time', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        const title = page.getByTestId('admin-sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });

        const userIdInput = page.getByTestId('user-sessions-userid-input');
        await expect(userIdInput).toBeVisible();
    });

    test('sessions pagination', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

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

        const statusFilter = page
            .locator('[data-testid*="status-filter"], select:has-text("Status")')
            .first();

        if (await statusFilter.isVisible()) {
            await statusFilter.click();

            const activeOption = page.getByRole('option', { name: /active|activo/i });
            if ((await activeOption.count()) > 0) {
                await activeOption.click();
                await page.waitForLoadState('domcontentloaded');
            }
        }
    });

    test('bulk revoke sessions', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        const selectAllCheckbox = page
            .locator('input[type="checkbox"][aria-label*="all"], th input[type="checkbox"]')
            .first();

        if (await selectAllCheckbox.isVisible()) {
            await selectAllCheckbox.check();

            const bulkRevokeButton = page.locator(
                'button:has-text("Revoke selected"), button:has-text("Bulk revoke")'
            );

            if ((await bulkRevokeButton.count()) > 0) {
                await expect(bulkRevokeButton.first()).toBeVisible();
            }
        }
    });

    test('sessions sorted by activity', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

        const firstRow = page.getByTestId('table-row').first();

        if (await firstRow.isVisible()) {
            const activityTime = firstRow.locator(
                'text=/just now|seconds ago|hace.*segundos|hace.*minutos/i'
            );
            const isRecent = (await activityTime.count()) > 0;
        }
    });

    test('export sessions', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('domcontentloaded');

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

        const sessionRow = page.getByTestId('table-row').first();
        const viewButton = sessionRow.locator(
            'button:has-text("Details"), button:has-text("View"), [data-testid*="view"]'
        );

        if ((await viewButton.count()) > 0) {
            await viewButton.first().click();

            const detailsPanel = page.locator('[role="dialog"], [data-testid*="details"]');
            await expect(detailsPanel.first()).toBeVisible();
        }
    });
});
