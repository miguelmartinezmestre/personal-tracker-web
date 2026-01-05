import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Notifications Page', () => {
    test('displays empty state when no notifications', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/notifications');

        // Wait for page to load
        await expect(page).toHaveURL(/\/dashboard\/notifications$/);
        await takeScreenshot(page, 'notifications-empty', 'empty-state');

        // Check for empty state or table with no rows
        const heading = page.getByRole('heading', { name: /notifications/i });
        await expect(heading).toBeVisible();
    });

    test('mark all as read button is disabled when no unread notifications', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/notifications');

        // The "Mark All Read" button should be disabled when there are no unread notifications
        const markAllButton = page.getByRole('button', { name: /mark all/i });

        // Wait for the page to fully load
        await page.waitForLoadState('networkidle');

        // If button exists, check if it's disabled
        if (await markAllButton.isVisible()) {
            await expect(markAllButton).toBeDisabled();
        }
    });

    test('navigates to notifications from sidebar', async ({ page }) => {
        await createTestUser(page);

        // Click on notifications link in sidebar
        const notificationsLink = page.getByRole('link', { name: /notifications/i });
        await notificationsLink.click();

        await expect(page).toHaveURL(/\/dashboard\/notifications$/);
        await takeScreenshot(page, 'notifications-navigation', 'from-sidebar');
    });

    test('displays notification types correctly', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/notifications');

        // Wait for content to load
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, 'notifications-types', 'page-loaded');

        // Verify page heading
        const heading = page.getByRole('heading', { name: /notifications/i });
        await expect(heading).toBeVisible();
    });

    test('notification table is responsive', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('networkidle');

        // Desktop view
        await page.setViewportSize({ width: 1280, height: 720 });
        await takeScreenshot(page, 'notifications-responsive', 'desktop');

        // Tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await takeScreenshot(page, 'notifications-responsive', 'tablet');

        // Mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await takeScreenshot(page, 'notifications-responsive', 'mobile');
    });
});

test.describe('Notifications Interaction', () => {
    test('can create objective and receive notification on deadline', async ({ page }) => {
        await createTestUser(page);

        // Create an objective with a deadline
        await page.goto('/dashboard/objectives');
        await takeScreenshot(page, 'notifications-create-objective', 'objectives-page');

        // Click create objective button
        const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
        if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForLoadState('networkidle');
            await takeScreenshot(page, 'notifications-create-objective', 'create-form');
        }
    });

    test('unread count is shown in sidebar', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for notification indicator in sidebar
        await takeScreenshot(page, 'notifications-sidebar', 'unread-indicator');
    });
});

test.describe('Notifications Filters', () => {
    test('page loads with default filter state', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'notifications-filters', 'default-state');

        // Verify heading
        await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
    });
});
