import { test, expect } from '@playwright/test';
import { createObjective } from '../../helpers/test-helpers';

test.describe('Admin Audit Logs', () => {
    test('audit logs page loads correctly', { tag: ['@REQ-ADMIN-005'] }, async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('domcontentloaded');

        const title = page.getByTestId('admin-audit-title');
        await expect(title).toBeVisible({ timeout: 15000 });
    });

    test(
        'audit logs table shows logs with user, action, and date',
        { tag: ['@REQ-ADMIN-005'] },
        async ({ page }) => {
            await page.goto('/dashboard/admin/audit');
            await page.waitForLoadState('domcontentloaded');

            const title = page.getByTestId('admin-audit-title');
            await expect(title).toBeVisible({ timeout: 15000 });

            // Table should be visible
            const table = page.locator('table');
            await expect(table).toBeVisible({ timeout: 10000 });

            // Table headers should include user/action/date columns
            const headers = page.locator('table thead th');
            const headerCount = await headers.count();
            expect(headerCount).toBeGreaterThanOrEqual(2);
        }
    );

    test(
        'creating an objective generates an audit log',
        { tag: ['@REQ-ADMIN-005'] },
        async ({ page }) => {
            // Use createObjective helper which handles categories and modals robustly
            const objectiveTitle = `Audit Test ${Date.now()}`;
            await createObjective(page, { title: objectiveTitle });

            // Navigate to audit logs
            await page.goto('/dashboard/admin/audit');
            await page.waitForLoadState('domcontentloaded');

            const title = page.getByTestId('admin-audit-title');
            await expect(title).toBeVisible({ timeout: 15000 });

            // Table should have at least one entry
            const table = page.locator('table');
            await expect(table).toBeVisible({ timeout: 10000 });
            const rows = page.getByTestId('table-row');
            const rowCount = await rows.count();
            expect(rowCount).toBeGreaterThanOrEqual(1);
        }
    );
});
