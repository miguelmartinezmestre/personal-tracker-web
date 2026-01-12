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
    await page.waitForLoadState('networkidle');

    // Open the create notification modal
    await page.getByTestId('notification-create-open').click();

    // Wait for the dialog to be visible and objectives to load
    await page.waitForTimeout(500);

    // Open the objective select dropdown
    await page.getByTestId('notification-objective-select').click();

    // Wait for the option to be visible before clicking
    const option = page.getByRole('option', { name: objectiveTitle });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    // Fill in the notification details
    await page.getByTestId('notification-type-input').fill('reminder');
    await page.getByTestId('notification-message-input').fill(message);

    // Save the notification
    await page.getByTestId('notification-save-button').click();

    // Wait for the notification to appear in the list
    await page.waitForTimeout(1000);
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

    // Button text is "Mark as read" or "Marcar como leído"
    const markReadButton = row.getByRole('button', { name: /mark.*read|marcar.*le[ií]d[oa]/i });
    await markReadButton.click();
    await page.waitForTimeout(500);

    // After clicking, the button should now say "Mark as unread"
    const markUnreadButton = row.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i });
    await expect(markUnreadButton).toBeVisible();

    // Click again to mark as unread
    await markUnreadButton.click();
    await page.waitForTimeout(500);
    // After clicking, the button should be back to "Mark as read"
    await expect(row.getByRole('button', { name: /mark.*read|marcar.*le[ií]d[oa]/i })).toBeVisible();

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

    // Verify all notifications are unread - they should already be visible from the last createNotification
    // But reload to ensure we have a clean state
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const row1 = page.locator('tr', { hasText: message1 }).first();
    const row2 = page.locator('tr', { hasText: message2 }).first();
    const row3 = page.locator('tr', { hasText: message3 }).first();

    // First verify the rows are visible
    await expect(row1).toBeVisible({ timeout: 10000 });
    await expect(row2).toBeVisible({ timeout: 10000 });
    await expect(row3).toBeVisible({ timeout: 10000 });

    // Then verify they contain "Unread" text
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
    // When a notification is read, the button says "Mark as unread"
    const updatedRow1 = page.locator('tr', { hasText: message1 }).first();
    const updatedRow2 = page.locator('tr', { hasText: message2 }).first();
    const updatedRow3 = page.locator('tr', { hasText: message3 }).first();

    // Check that "Mark as unread" button is visible (meaning the notification is read)
    await expect(
        updatedRow1.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })
    ).toBeVisible();
    await expect(
        updatedRow2.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })
    ).toBeVisible();
    await expect(
        updatedRow3.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })
    ).toBeVisible();

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
    await page.waitForTimeout(500);

    // First verify all rows are visible
    const row1 = page.locator('tr', { hasText: message1 }).first();
    const row2 = page.locator('tr', { hasText: message2 }).first();
    const row3 = page.locator('tr', { hasText: message3 }).first();
    await expect(row1).toBeVisible({ timeout: 10000 });
    await expect(row2).toBeVisible({ timeout: 10000 });
    await expect(row3).toBeVisible({ timeout: 10000 });

    // Mark the first one as read manually
    // Button text is "Mark as read" or "Marcar como leído" (not "Mark as unread")
    const markReadButton = row1.getByRole('button', { name: /mark as read|marcar como le[ií]d[oa]/i });
    await expect(markReadButton).toBeVisible({ timeout: 5000 });
    await markReadButton.click();
    await page.waitForTimeout(500);

    // Verify we have mixed read/unread - row1 should now have "Mark as unread" button
    await expect(row1.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })).toBeVisible();
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

    // Verify all notifications are read by checking that "Mark as unread" button is visible
    await expect(
        updatedRow1.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })
    ).toBeVisible();
    await expect(
        updatedRow2.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })
    ).toBeVisible();
    await expect(
        updatedRow3.getByRole('button', { name: /mark.*unread|marcar.*no.*le[ií]d[oa]/i })
    ).toBeVisible();
});
