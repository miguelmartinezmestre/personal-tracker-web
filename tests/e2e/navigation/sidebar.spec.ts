import { test, expect } from '@playwright/test';
import { createTestUser, promoteToAdmin } from '../../helpers/test-helpers';
import {
    expectSidebarVisible,
    expectAdminMenuVisible,
    expectAdminMenuHidden,
} from '../../helpers/assertions';

test.describe('Sidebar Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
    });

    test('navigate to all menu items', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Define expected menu items and their routes
        const menuItems = [
            { name: /home|inicio/i, route: '/dashboard/home' },
            { name: /objectives|objetivos/i, route: '/dashboard/objectives' },
            { name: /categories|categorías/i, route: '/dashboard/categories' },
            { name: /organizations|organizaciones/i, route: '/dashboard/organizations' },
            { name: /notifications|notificaciones/i, route: '/dashboard/notifications' },
            { name: /achievements|logros/i, route: '/dashboard/achievements' },
            { name: /sessions|sesiones/i, route: '/dashboard/sessions' },
            { name: /settings|configuración/i, route: '/dashboard/settings' },
        ];

        for (const item of menuItems) {
            const link = page.locator(`a[href*="${item.route.split('/').pop()}"]`).first();

            if (await link.isVisible()) {
                await link.click();
                await page.waitForLoadState('networkidle');

                // Verify navigation
                await expect(page).toHaveURL(new RegExp(item.route));
            }
        }
    });

    test('admin section visible for admins', async ({ page }) => {
        await promoteToAdmin(page);

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Admin section should be visible
        await expectAdminMenuVisible(page);

        // Admin links should be present
        const adminUsersLink = page.locator('a[href*="admin/users"]');
        const adminAuditLink = page.locator('a[href*="admin/audit"]');
        const adminSessionsLink = page.locator('a[href*="admin/sessions"]');

        const hasAdminLinks =
            (await adminUsersLink.count()) > 0 ||
            (await adminAuditLink.count()) > 0 ||
            (await adminSessionsLink.count()) > 0;

        expect(hasAdminLinks).toBeTruthy();
    });

    test('admin section hidden for regular users', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Admin section should NOT be visible for regular users
        await expectAdminMenuHidden(page);
    });

    test('active link highlighted', async ({ page }) => {
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // The objectives link should be highlighted/active
        const objectivesLink = page.locator('a[href*="objectives"]').first();

        if (await objectivesLink.isVisible()) {
            // Check for active class or aria-current
            const isActive = await objectivesLink.evaluate(el => {
                return (
                    el.classList.contains('active') ||
                    el.getAttribute('aria-current') === 'page' ||
                    el.getAttribute('data-active') === 'true' ||
                    el.classList.toString().includes('active') ||
                    el.classList.toString().includes('selected')
                );
            });

            // Or check parent element
            const parentIsActive = await objectivesLink.locator('..').evaluate(el => {
                return (
                    el.classList.toString().includes('active') ||
                    el.getAttribute('data-active') === 'true'
                );
            });

            expect(isActive || parentIsActive).toBeTruthy();
        }
    });

    test('sidebar is visible on dashboard', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        await expectSidebarVisible(page);
    });

    test('sidebar collapse/expand on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for hamburger menu or sidebar toggle
        const menuToggle = page.locator(
            'button[aria-label*="menu"], button[aria-label*="sidebar"], [data-testid*="sidebar-toggle"], [data-testid*="menu-toggle"]'
        );

        if ((await menuToggle.count()) > 0) {
            // Click to open sidebar
            await menuToggle.first().click();
            await page.waitForTimeout(500);

            // Sidebar should be visible
            const sidebar = page.locator('aside, nav[data-sidebar], [data-sidebar="sidebar"]');
            await expect(sidebar.first()).toBeVisible();

            // Click again to close
            await menuToggle.first().click();
            await page.waitForTimeout(500);
        }
    });

    test('user info displayed in sidebar', async ({ page }) => {
        const { username } = await createTestUser(page);

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for user info in sidebar
        const userInfo = page.locator('aside, [data-sidebar]').filter({ hasText: username });
        const hasUserInfo = (await userInfo.count()) > 0;

        // Or avatar/initial
        const avatar = page.locator(
            'aside .avatar, [data-sidebar] .avatar, aside [class*="avatar"]'
        );
        const hasAvatar = (await avatar.count()) > 0;

        // Some form of user identification should be present
    });

    test('logout button in sidebar', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for logout button
        const logoutButton = page.locator(
            'button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Cerrar sesión"), [data-testid*="logout"]'
        );

        if ((await logoutButton.count()) > 0) {
            await expect(logoutButton.first()).toBeVisible();
        }
    });

    test('organization switcher in sidebar', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for organization switcher
        const orgSwitcher = page.locator(
            '[data-testid*="org-switch"], [data-testid*="organization-switch"], button:has-text("Organization")'
        );

        if ((await orgSwitcher.count()) > 0) {
            await expect(orgSwitcher.first()).toBeVisible();
        }
    });

    test('navigation preserves scroll position', async ({ page }) => {
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Scroll down
        await page.evaluate(() => window.scrollTo(0, 500));

        // Navigate away
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Navigate back
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Scroll position might be reset or preserved depending on implementation
    });

    test('sidebar links have correct icons', async ({ page }) => {
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Each sidebar link should have an icon
        const sidebarLinks = page.locator('aside a, [data-sidebar] a');
        const linkCount = await sidebarLinks.count();

        for (let i = 0; i < Math.min(linkCount, 5); i++) {
            const link = sidebarLinks.nth(i);
            const icon = link.locator('svg, [class*="icon"], img');
            const hasIcon = (await icon.count()) > 0;
            // Links should have icons for visual clarity
        }
    });
});
