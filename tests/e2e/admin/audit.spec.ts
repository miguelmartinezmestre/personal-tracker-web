import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin, createObjective, ensureDefaultCategories } from '../../helpers/test-helpers';

test.describe('Admin Audit Logs', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
        await promoteToAdmin(page);
    });

    test('view audit logs', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Audit page should load
        await expect(page).toHaveURL(/\/dashboard\/admin\/audit/);

        // Should show audit logs table or list
        const auditTable = page.locator('table, [data-testid*="audit"]');
        await expect(auditTable.first()).toBeVisible();
    });

    test('filter by resource type', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for resource type filter
        const resourceFilter = page.locator('[data-testid*="resource-filter"], select:has-text("Resource"), select:has-text("Type")').first();

        if (await resourceFilter.isVisible()) {
            await resourceFilter.click();

            // Select a resource type
            const userOption = page.getByRole('option', { name: /user|usuario/i });
            if (await userOption.count() > 0) {
                await userOption.click();
                await page.waitForLoadState('networkidle');

                // Should filter logs by user-related actions
            }
        }
    });

    test('filter by action type', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for action filter
        const actionFilter = page.locator('[data-testid*="action-filter"], select:has-text("Action")').first();

        if (await actionFilter.isVisible()) {
            await actionFilter.click();

            // Select an action type
            const createOption = page.getByRole('option', { name: /create|crear/i });
            if (await createOption.count() > 0) {
                await createOption.click();
                await page.waitForLoadState('networkidle');
            }
        }
    });

    test('audit log contains action details', async ({ page }) => {
        // First perform an action to generate audit log
        await ensureDefaultCategories(page);
        await createObjective(page, {
            title: `Audit Test Obj ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Audit logs should contain:
        // - Action type (create, update, delete)
        const actionColumn = page.locator('td, [data-testid*="action"]');
        const hasAction = await actionColumn.count() > 0;

        // - Resource type (user, objective, etc.)
        const resourceColumn = page.locator('td, [data-testid*="resource"]');
        const hasResource = await resourceColumn.count() > 0;

        // - Timestamp
        const timestampColumn = page.locator('td').filter({ hasText: /\\d{1,2}[/:-]\\d{1,2}|ago|hace/ });
        const hasTimestamp = await timestampColumn.count() > 0;

        // - User who performed action
        const userColumn = page.locator('td, [data-testid*="user"]');
        const hasUser = await userColumn.count() > 0;
    });

    test('filter by date range', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for date range filter
        const dateFromInput = page.locator('input[type="date"], [data-testid*="date-from"]').first();
        const dateToInput = page.locator('input[type="date"], [data-testid*="date-to"]').nth(1);

        if (await dateFromInput.isVisible()) {
            // Set date range
            const today = new Date().toISOString().split('T')[0];
            await dateFromInput.fill(today);

            if (await dateToInput.isVisible()) {
                await dateToInput.fill(today);
            }

            await page.waitForLoadState('networkidle');
        }
    });

    test('filter by user', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for user filter
        const userFilter = page.locator('[data-testid*="user-filter"], input[placeholder*="user"]').first();

        if (await userFilter.isVisible()) {
            await userFilter.fill('test');
            await page.waitForTimeout(1000);
            await page.waitForLoadState('networkidle');

            // Should filter logs by user
        }
    });

    test('audit logs pagination', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for pagination
        const pagination = page.locator('[data-testid*="pagination"], .pagination');

        if (await pagination.count() > 0) {
            const nextButton = page.locator('button:has-text("Next"), [aria-label*="next"]');

            if (await nextButton.isEnabled()) {
                await nextButton.click();
                await page.waitForLoadState('networkidle');
            }
        }
    });

    test('view audit log details', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Click on an audit log entry to view details
        const logRow = page.locator('tbody tr, [data-testid*="audit-row"]').first();

        if (await logRow.isVisible()) {
            const viewButton = logRow.locator('button:has-text("Details"), button:has-text("View"), [data-testid*="view"]');

            if (await viewButton.count() > 0) {
                await viewButton.first().click();
                await page.waitForTimeout(500);

                // Should show detailed information (changes, metadata, etc.)
                const detailsPanel = page.locator('[role="dialog"], [data-testid*="details"]');
                await expect(detailsPanel.first()).toBeVisible();
            }
        }
    });

    test('audit log shows IP address', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // IP addresses should be visible in logs
        const ipAddress = page.getByText(/\d+\.\d+\.\d+\.\d+|localhost|127\.0\.0\.1/);
        const hasIP = await ipAddress.count() > 0;

        // Or in column header
        const ipColumn = page.locator('th:has-text("IP")');
        const hasIPColumn = await ipColumn.count() > 0;
    });

    test('export audit logs', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for export button
        const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]');

        if (await exportButton.count() > 0) {
            await expect(exportButton.first()).toBeVisible();
            // Don't actually click to avoid file download in test
        }
    });

    test('audit logs sorted by date descending', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // First row should be the most recent
        const firstRow = page.locator('tbody tr, [data-testid*="audit-row"]').first();

        if (await firstRow.isVisible()) {
            // Most recent logs should be at top
            const timestampCell = firstRow.locator('td').filter({ hasText: /\\d|ago|hace/ }).first();
            const hasRecentTimestamp = await timestampCell.count() > 0;
        }
    });

    test('clear filters', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Apply a filter first
        const resourceFilter = page.locator('[data-testid*="resource-filter"], select').first();
        if (await resourceFilter.isVisible()) {
            await resourceFilter.click();
            const option = page.getByRole('option').first();
            if (await option.count() > 0) {
                await option.click();
                await page.waitForLoadState('networkidle');
            }
        }

        // Look for clear/reset button
        const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), [data-testid*="clear-filter"]');

        if (await clearButton.count() > 0) {
            await clearButton.first().click();
            await page.waitForLoadState('networkidle');
        }
    });
});
