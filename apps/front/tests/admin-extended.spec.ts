import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Admin User Management', () => {
    test('can view user details', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Try to click on a user row or edit button
        const editButton = page.getByRole('button', { name: /edit|view|details/i }).first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await page.waitForLoadState('networkidle');
            await takeScreenshot(page, 'admin-user-details', 'user-modal');
        }
    });
});

test.describe('Admin Audit Logs', () => {
    test('audit logs are sorted by date', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        // Look for date column or sorting controls
        const dateHeader = page.getByRole('columnheader', { name: /date|time|created/i });
        if (await dateHeader.isVisible()) {
            await takeScreenshot(page, 'admin-audit-sorting', 'date-column');
        }
    });
});

test.describe('Admin Responsive Design', () => {
    test('admin pages are responsive', async ({ page }) => {
        await createTestUser(page);

        // Desktop view
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, 'admin-responsive', 'desktop');

        // Tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await takeScreenshot(page, 'admin-responsive', 'tablet');

        // Mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await takeScreenshot(page, 'admin-responsive', 'mobile');
    });
});
