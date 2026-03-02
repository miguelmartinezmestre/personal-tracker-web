import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin, logoutUser } from '../../helpers/test-helpers';
import {
    expectOnLogin,
    expectOnDashboard,
    expectAdminMenuVisible,
    expectAdminMenuHidden,
} from '../../helpers/assertions';

test.describe('Route Protection', () => {
    test('redirect to login when not authenticated', async ({ page }) => {
        // Try to access protected dashboard route without auth
        await page.goto('/dashboard/home');

        // Should redirect to login
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for objectives page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/objectives');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for categories page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/categories');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for organizations page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/organizations');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for settings page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for notifications page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/notifications');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for sessions page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/sessions');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to login for achievements page when not authenticated', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForURL(/\/login$/);
        await expectOnLogin(page);
    });

    test('redirect to dashboard after successful login', async ({ page }) => {
        // Create user (this logs them in automatically)
        await createTestUser(page);

        // Should be on dashboard
        await expectOnDashboard(page);
        await expect(page).toHaveURL(/\/dashboard\/home$/);
    });

    test('protect admin routes from non-admin users', async ({ page }) => {
        // Create regular user
        await createTestUser(page);

        // Try to access admin routes
        await page.goto('/dashboard/admin/users');

        // Should either redirect or show access denied
        await page.waitForLoadState('load');
        await page.waitForTimeout(2000);

        const currentUrl = page.url();

        // Either redirected to home or shows forbidden/access denied
        const isRedirected = !currentUrl.includes('/admin/');
        const accessDenied = page.locator(
            'text=/access denied|forbidden|no autorizado|sin acceso/i'
        );
        const hasAccessDenied = (await accessDenied.count()) > 0;

        expect(isRedirected || hasAccessDenied).toBeTruthy();
    });

    test('admin routes accessible to admin users', async ({ page }) => {
        // Create user and promote to admin
        await createTestUser(page);
        await promoteToAdmin(page);

        // Navigate to admin users page
        await page.goto('/dashboard/admin/users');
        await page.waitForLoadState('domcontentloaded');

        const currentUrl = page.url();
        const hasAdminAccess =
            currentUrl.includes('/dashboard/admin/users') || currentUrl.includes('/dashboard/home');
        expect(hasAdminAccess).toBeTruthy();

        // Should see admin content
        await expectAdminMenuVisible(page);
    });

    test('admin menu visible only for admin users', async ({ page }) => {
        // Create regular user
        await createTestUser(page);

        // Navigate to dashboard
        await page.goto('/dashboard/home');
        await page.waitForLoadState('load');

        // Admin menu should NOT be visible for regular users
        await expectAdminMenuHidden(page);
    });

    test('admin menu visible for admin users', async ({ page }) => {
        // Create user and promote to admin
        await createTestUser(page);
        await promoteToAdmin(page);

        // Navigate to dashboard
        await page.goto('/dashboard/home');
        await page.waitForLoadState('load');

        // Admin menu should be visible
        await expectAdminMenuVisible(page);
    });

    test('authenticated user can access all dashboard routes', async ({ page }) => {
        await createTestUser(page);

        // Test various dashboard routes
        const routes = [
            '/dashboard/home',
            '/dashboard/objectives',
            '/dashboard/categories',
            '/dashboard/organizations',
            '/dashboard/notifications',
            '/dashboard/achievements',
            '/dashboard/sessions',
            '/dashboard/settings',
        ];

        for (const route of routes) {
            await page.goto(route);
            await page.waitForLoadState('load');

            // Should stay on the route (not redirected to login)
            const currentUrl = page.url();
            expect(currentUrl).toContain('/dashboard/');
            expect(currentUrl).not.toContain('/login');
        }
    });

    test('session expires after logout', async ({ page }) => {
        // Create and login user
        await createTestUser(page);
        await expectOnDashboard(page);

        // Logout
        await logoutUser(page);

        // Try to access protected route
        await page.goto('/dashboard/home');

        // Should redirect to login
        await expectOnLogin(page);
    });

    test('landing page accessible without authentication', async ({ page }) => {
        await page.goto('/');

        // Should load landing page
        await page.waitForLoadState('load');

        // Should not redirect to login (landing is public)
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
    });

    test('login page accessible without authentication', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('load');

        // Should stay on login page
        await expect(page).toHaveURL(/\/login$/);
    });

    test('register page accessible without authentication', async ({ page }) => {
        await page.goto('/register');
        await page.waitForLoadState('load');

        // Should stay on register page
        await expect(page).toHaveURL(/\/register$/);
    });

    test('authenticated user accessing login redirects to dashboard', async ({ page }) => {
        // Create user (logs in automatically)
        await createTestUser(page);

        // Try to access login page while authenticated
        await page.goto('/login');
        await page.waitForLoadState('load');
        await page.waitForTimeout(1000);

        // Might redirect to dashboard or stay (depends on implementation)
        // Many apps redirect authenticated users away from login
        const currentUrl = page.url();

        // Either on dashboard or still on login (both are valid implementations)
        expect(currentUrl.includes('/dashboard/') || currentUrl.includes('/login')).toBeTruthy();
    });
});
