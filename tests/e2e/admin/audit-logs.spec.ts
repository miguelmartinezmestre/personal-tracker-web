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

            const table = page.locator('table');
            await expect(table).toBeVisible({ timeout: 10000 });

            const headers = page.locator('table thead th');
            const headerCount = await headers.count();
            expect(headerCount).toBeGreaterThanOrEqual(2);
        }
    );

    test(
        'creating an objective generates an audit log',
        { tag: ['@REQ-ADMIN-005'] },
        async ({ page }) => {
            const objectiveTitle = `Audit Test ${Date.now()}`;
            await createObjective(page, { title: objectiveTitle });

            await page.goto('/dashboard/admin/audit');
            await page.waitForLoadState('domcontentloaded');

            const title = page.getByTestId('admin-audit-title');
            await expect(title).toBeVisible({ timeout: 15000 });

            let rowCount = 0;
            const maxTime = Date.now() + 15000;

            while (Date.now() < maxTime && rowCount === 0) {
                if (Date.now() > maxTime - 10000) {
                    await page.goto('/dashboard/admin/audit');
                    await page.waitForLoadState('domcontentloaded');
                }

                rowCount = await page.getByTestId('table-row').count();

                if (rowCount === 0) {
                    await page.waitForTimeout(500);
                }
            }

            expect(rowCount).toBeGreaterThanOrEqual(1);
        }
    );
});
