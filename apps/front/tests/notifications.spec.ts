import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createTestUser } from './test-helpers';

async function createObjective(page: import('@playwright/test').Page, title: string) {
    await page.goto('/dashboard/objectives');
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill('Objective for notifications');
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: /personal/i }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill('1');
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
}

async function createNotification(
    page: import('@playwright/test').Page,
    objectiveTitle: string,
    message: string
) {
    await page.goto('/dashboard/notifications');
    await page.getByTestId('notification-create-open').click();
    await page.getByTestId('notification-objective-select').click();
    await page.getByRole('option', { name: objectiveTitle }).click();
    await page.getByTestId('notification-type-input').fill('reminder');
    await page.getByTestId('notification-message-input').fill(message);
    await page.getByTestId('notification-save-button').click();
    await expect(page.getByText(message)).toBeVisible({ timeout: 10000 });
}

test('notifications: create, mark read/unread, delete', async ({ page }) => {
    const uuid = randomUUID();
    const objectiveTitle = `notif-objective-${uuid}`;
    const message = `Notification message ${uuid}`;

    await createTestUser(page);
    await createObjective(page, objectiveTitle);

    await page.goto('/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);

    await page.getByTestId('notification-create-open').click();
    await page.getByTestId('notification-objective-select').click();
    await page.getByRole('option', { name: objectiveTitle }).click();
    await page.getByTestId('notification-type-input').fill('reminder');
    await page.getByTestId('notification-message-input').fill(message);
    await page.getByTestId('notification-save-button').click();

    const row = page.locator('tr', { hasText: message }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(/unread|no le[ií]d[oa]/i);

    const markRead = row.getByRole('button', { name: /mark read|marcar.*le[ií]d[oa]/i });
    await markRead.click();
    await expect(row).toContainText(/read|le[ií]d[oa]/i);

    const markUnread = row.getByRole('button', { name: /mark unread|no le[ií]d[oa]/i });
    await markUnread.click();
    await expect(row).toContainText(/unread|no le[ií]d[oa]/i);

    await row.getByRole('button', { name: /delete|eliminar/i }).click();
    const deleteDialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: /delete|eliminar|confirmar|confirm/i }).click();
    await expect(deleteDialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(message)).not.toBeVisible({ timeout: 10000 });
});

test('notifications: mark all as read', async ({ page }) => {
    const uuid = randomUUID();
    const objectiveTitle = `notif-markall-${uuid}`;

    await createTestUser(page);
    await createObjective(page, objectiveTitle);

    // Create multiple unread notifications
    const message1 = `Notification 1 ${uuid}`;
    const message2 = `Notification 2 ${uuid}`;
    const message3 = `Notification 3 ${uuid}`;

    await createNotification(page, objectiveTitle, message1);
    await createNotification(page, objectiveTitle, message2);
    await createNotification(page, objectiveTitle, message3);

    // Verify all notifications are unread
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');

    const row1 = page.locator('tr', { hasText: message1 }).first();
    const row2 = page.locator('tr', { hasText: message2 }).first();
    const row3 = page.locator('tr', { hasText: message3 }).first();

    await expect(row1).toContainText(/unread|no le[ií]d[oa]/i);
    await expect(row2).toContainText(/unread|no le[ií]d[oa]/i);
    await expect(row3).toContainText(/unread|no le[ií]d[oa]/i);

    // Click "Mark all as read" button
    const markAllButton = page.getByRole('button', { name: /mark all.*read|marcar.*le[ií]d[oa]/i });
    await expect(markAllButton).toBeVisible();
    await expect(markAllButton).toBeEnabled();
    await markAllButton.click();

    // Wait for the mutation to complete
    await page.waitForTimeout(1000);

    // Reload to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all notifications are now read
    const updatedRow1 = page.locator('tr', { hasText: message1 }).first();
    const updatedRow2 = page.locator('tr', { hasText: message2 }).first();
    const updatedRow3 = page.locator('tr', { hasText: message3 }).first();

    await expect(updatedRow1).not.toContainText(/unread|no le[ií]d[oa]/i);
    await expect(updatedRow2).not.toContainText(/unread|no le[ií]d[oa]/i);
    await expect(updatedRow3).not.toContainText(/unread|no le[ií]d[oa]/i);

    // Verify the mark all button is now disabled (no unread notifications)
    const markAllButtonAfter = page.getByRole('button', {
        name: /mark all.*read|marcar.*le[ií]d[oa]/i,
    });
    await expect(markAllButtonAfter).toBeDisabled();
});

test('notifications: mark all as read with mixed read/unread', async ({ page }) => {
    const uuid = randomUUID();
    const objectiveTitle = `notif-mixed-${uuid}`;

    await createTestUser(page);
    await createObjective(page, objectiveTitle);

    // Create three notifications
    const message1 = `Read notification ${uuid}`;
    const message2 = `Unread notification 1 ${uuid}`;
    const message3 = `Unread notification 2 ${uuid}`;

    await createNotification(page, objectiveTitle, message1);
    await createNotification(page, objectiveTitle, message2);
    await createNotification(page, objectiveTitle, message3);

    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');

    // Mark the first one as read manually
    const row1 = page.locator('tr', { hasText: message1 }).first();
    const markReadButton = row1.getByRole('button', { name: /mark read|marcar.*le[ií]d[oa]/i });
    await markReadButton.click();
    await page.waitForTimeout(500);

    // Verify we have mixed read/unread
    await expect(row1).not.toContainText(/unread|no le[ií]d[oa]/i);
    const row2 = page.locator('tr', { hasText: message2 }).first();
    const row3 = page.locator('tr', { hasText: message3 }).first();
    await expect(row2).toContainText(/unread|no le[ií]d[oa]/i);
    await expect(row3).toContainText(/unread|no le[ií]d[oa]/i);

    // Mark all as read
    const markAllButton = page.getByRole('button', { name: /mark all.*read|marcar.*le[ií]d[oa]/i });
    await markAllButton.click();
    await page.waitForTimeout(1000);

    // Reload and verify all are read
    await page.reload();
    await page.waitForLoadState('networkidle');

    const updatedRow1 = page.locator('tr', { hasText: message1 }).first();
    const updatedRow2 = page.locator('tr', { hasText: message2 }).first();
    const updatedRow3 = page.locator('tr', { hasText: message3 }).first();

    await expect(updatedRow1).not.toContainText(/unread|no le[ií]d[oa]/i);
    await expect(updatedRow2).not.toContainText(/unread|no le[ií]d[oa]/i);
    await expect(updatedRow3).not.toContainText(/unread|no le[ií]d[oa]/i);
});
