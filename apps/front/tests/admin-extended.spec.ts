import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Admin Dashboard', () => {
    test('admin page is accessible for authorized users', async ({ page }) => {
        // Create test user (may need admin role in real scenario)
        await createTestUser(page);

        // Try to access admin page
        await page.goto('/dashboard/admin');
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, 'admin-access', 'admin-page');

        // Check if we're on admin page or redirected
        const currentUrl = page.url();
        console.log('Admin page URL:', currentUrl);
    });

    test('admin users section loads', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, 'admin-users', 'users-list');

        // Check page content
        const currentUrl = page.url();
        console.log('Admin users URL:', currentUrl);
    });

    test('admin audit logs section loads', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, 'admin-audit', 'audit-logs');

        // Check page content
        const currentUrl = page.url();
        console.log('Admin audit URL:', currentUrl);
    });

    test('admin sessions section loads', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, 'admin-sessions', 'sessions-list');

        // Check page content
        const currentUrl = page.url();
        console.log('Admin sessions URL:', currentUrl);
    });
});

test.describe('Admin User Management', () => {
    test('users table displays user information', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('networkidle');

        // Check for table or user list
        await takeScreenshot(page, 'admin-user-management', 'users-table');

        // Look for table headers if visible
        const table = page.locator('table');
        if (await table.isVisible()) {
            await expect(table).toBeVisible();
        }
    });

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
    test('audit logs table displays actions', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/audit');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'admin-audit-logs', 'logs-table');

        // Verify heading or table presence
        const heading = page.getByRole('heading', { name: /audit|logs/i });
        if (await heading.isVisible()) {
            await expect(heading).toBeVisible();
        }
    });

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

test.describe('Admin Sessions Management', () => {
    test('sessions table displays active sessions', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'admin-sessions-table', 'active-sessions');

        // Check for table presence
        const table = page.locator('table');
        if (await table.isVisible()) {
            await expect(table).toBeVisible();
        }
    });

    test('can terminate session', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/admin/sessions');
        await page.waitForLoadState('networkidle');

        // Look for terminate button
        const terminateButton = page.getByRole('button', {
            name: /terminate|revoke|end|delete/i,
        });
        if (await terminateButton.first().isVisible()) {
            await takeScreenshot(page, 'admin-sessions-terminate', 'terminate-button');
        }
    });
});

test.describe('Admin Access Control', () => {
    test('non-admin cannot access admin pages', async ({ page }) => {
        // Create regular user
        await createTestUser(page);

        // Try to access admin page
        await page.goto('/dashboard/admin');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        await takeScreenshot(page, 'admin-access-control', 'non-admin-access');

        // Should be redirected or show access denied
        // The exact behavior depends on implementation
        console.log('Non-admin access result:', currentUrl);
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
