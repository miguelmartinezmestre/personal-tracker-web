import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('notifications: page loads and displays notifications heading', async ({ page }) => {
    // Register and login
    await createTestUser(page);

    // Navigate to Notifications
    await page.goto('/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);

    // Verify page heading is visible
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
});

test('notifications: accessible from sidebar navigation', async ({ page }) => {
    // Register and login
    await createTestUser(page);

    // Navigate to Notifications via sidebar
    await page.getByRole('link', { name: /notifications/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
});
