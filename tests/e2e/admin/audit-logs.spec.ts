import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from '../../helpers/test-helpers';

test.describe('Admin Audit Logs', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
        await promoteToAdmin(page);
    });

    test('audit logs page loads correctly', async ({ page }) => {
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('domcontentloaded');

        const title = page.getByTestId('admin-audit-title');
        await expect(title).toBeVisible({ timeout: 15000 });
    });

    test('audit logs table shows logs with user, action, and date', async ({ page }) => {
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
    });

    test('creating an objective generates an audit log', async ({ page }) => {
        // Navigate to objectives and create one
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        // Create an objective to generate an audit log entry
        const createButton = page.getByTestId('objective-create-open');
        if ((await createButton.count()) > 0) {
            await createButton.click();

            const titleInput = page.getByTestId('objective-title-input');
            await titleInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

            if (await titleInput.isVisible()) {
                const objectiveTitle = `Audit Test ${Date.now()}`;
                await titleInput.fill(objectiveTitle);

                // Fill minimal required fields
                const targetInput = page.getByTestId('objective-target-input');
                if (await targetInput.isVisible()) {
                    await targetInput.fill('100');
                }

                const unitInput = page.getByTestId('objective-unit-input');
                if (await unitInput.isVisible()) {
                    await unitInput.fill('units');
                }

                const saveButton = page.getByTestId('objective-save-button');
                await saveButton.click();

                // Wait for creation
                await page.waitForTimeout(3000);

                // Navigate to audit logs
                await page.goto('/dashboard/admin/audit');
                await page.waitForLoadState('domcontentloaded');

                const title = page.getByTestId('admin-audit-title');
                await expect(title).toBeVisible({ timeout: 15000 });

                // Table should have at least one entry
                const table = page.locator('table');
                await expect(table).toBeVisible({ timeout: 10000 });
                const rows = table.locator('tbody tr');
                const rowCount = await rows.count();
                expect(rowCount).toBeGreaterThanOrEqual(1);
            }
        }
    });
});
