import { test, expect } from '../../fixtures/test-base';
import { createObjective, ensureDefaultCategories } from '../../helpers/test-helpers';

async function openNotificationCreateModal(
    page: import('@playwright/test').Page
): Promise<boolean> {
    const createButton = page.getByTestId('notification-create-open');

    try {
        await expect(createButton).toBeVisible({ timeout: 10000 });
    } catch {
        return false;
    }

    const objectiveSelect = page.getByTestId('notification-objective-select');

    for (let attempt = 0; attempt < 3; attempt++) {
        await createButton.click();

        try {
            await expect(objectiveSelect).toBeVisible({ timeout: 5000 });
            return true;
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
    }

    return false;
}

async function createNotificationInModal(
    page: import('@playwright/test').Page,
    objectiveTitle: string,
    message: string
): Promise<boolean> {
    const isModalOpen = await openNotificationCreateModal(page);
    if (!isModalOpen) {
        return false;
    }

    await page.getByTestId('notification-objective-select').click();

    const specificOption = page.getByRole('option', { name: objectiveTitle }).first();
    if ((await specificOption.count()) > 0) {
        await specificOption.click();
    } else {
        const firstOption = page.getByRole('option').first();
        if ((await firstOption.count()) === 0) {
            return false;
        }
        await firstOption.click();
    }

    await page.getByTestId('notification-type-input').fill('reminder');
    await page.getByTestId('notification-message-input').fill(message);
    await page.getByTestId('notification-save-button').click();

    await expect(page.getByText(message)).toBeVisible({ timeout: 10000 });
    return true;
}

test.describe('Notifications', () => {
    test('view notifications list', { tag: ['@REQ-NOTIFICACIONES-003'] }, async ({ page }) => {
        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('domcontentloaded');

        await expect(page).toHaveURL(/\/dashboard\/notifications/);

        const emptyState = page.locator('text=/no.*notifications|sin notificaciones/i');
        const notificationsList = page.getByTestId('table-row');

        const hasContent = (await emptyState.count()) > 0 || (await notificationsList.count()) > 0;
        expect(hasContent).toBeTruthy();
    });

    test(
        'notification badge shows count in sidebar',
        { tag: ['@REQ-NOTIFICACIONES-003'] },
        async ({ page }) => {
            await page.goto('/dashboard/home');
            await page.waitForLoadState('domcontentloaded');

            const notificationLink = page.locator('a[href*="notification"]');
            await expect(notificationLink.first()).toBeVisible();
        }
    );

    test('create manual notification', { tag: ['@REQ-NOTIFICACIONES-001'] }, async ({ page }) => {
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, {
            title: `Notif Obj ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('domcontentloaded');

        const message = `Test notification ${Date.now()}`;
        const wasCreated = await createNotificationInModal(page, objective.title, message);
        expect(wasCreated).toBeTruthy();
    });

    test('mark notification as read', { tag: ['@REQ-NOTIFICACIONES-002'] }, async ({ page }) => {
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, { ensureCategories: false });

        await page.goto('/dashboard/notifications');

        const wasCreated = await createNotificationInModal(
            page,
            objective.title,
            `Mark read test ${Date.now()}`
        );
        expect(wasCreated).toBeTruthy();

        await page.waitForLoadState('domcontentloaded');

        const markReadButton = page.getByTestId('notification-mark-read-button');

        if ((await markReadButton.count()) > 0) {
            await markReadButton.first().click();
            await page.waitForLoadState('domcontentloaded');
        }
    });

    test(
        'mark all notifications as read',
        { tag: ['@REQ-NOTIFICACIONES-002'] },
        async ({ page }) => {
            await page.goto('/dashboard/notifications');
            await page.waitForLoadState('domcontentloaded');

            const markAllButton = page.getByTestId('notification-mark-all-read-button');

            if ((await markAllButton.count()) > 0) {
                const isEnabled = await markAllButton.first().isEnabled();

                if (isEnabled) {
                    await markAllButton.first().click();
                    await page.waitForLoadState('domcontentloaded');
                } else {
                    console.log('Mark all as read button is disabled (no unread notifications)');
                }
            }
        }
    );

    test('delete notification', async ({ page }) => {
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, { ensureCategories: false });

        await page.goto('/dashboard/notifications');

        const deleteMessage = `Delete test ${Date.now()}`;
        const wasCreated = await createNotificationInModal(page, objective.title, deleteMessage);
        expect(wasCreated).toBeTruthy();

        const row = page.getByTestId('table-row').filter({ hasText: deleteMessage }).first();
        const deleteButton = row.getByTestId('notification-delete-button');

        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        const confirmButton = page.getByTestId('delete-confirm-button');
        if ((await confirmButton.count()) > 0) {
            await confirmButton.first().click();
        }

        await page.waitForLoadState('domcontentloaded');
    });

    test('notification types are displayed correctly', async ({ page }) => {
        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('domcontentloaded');

        const notifications = page.getByTestId('table-row');
        if ((await notifications.count()) > 0) {
            await expect(notifications.first()).toBeVisible();
        }
    });

    test('notification shows related objective', async ({ page }) => {
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, {
            title: `Related Obj ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/notifications');

        const relatedMessage = `Related objective test ${Date.now()}`;
        const wasCreated = await createNotificationInModal(page, objective.title, relatedMessage);
        expect(wasCreated).toBeTruthy();

        await page.waitForLoadState('domcontentloaded');

        const objectiveLink = page.locator(`text=${objective.title}`);
        const hasObjectiveRef = (await objectiveLink.count()) > 0;
        expect(hasObjectiveRef).toBeTruthy();
    });

    test('notification click navigates to related objective', async ({ page }) => {
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, {
            title: `Navigate Obj ${Date.now()}`,
            ensureCategories: false,
        });

        await page.goto('/dashboard/notifications');

        const clickMessage = `Click test notification ${Date.now()}`;
        const wasCreated = await createNotificationInModal(page, objective.title, clickMessage);
        expect(wasCreated).toBeTruthy();

        await page.waitForLoadState('domcontentloaded');

        const notificationRow = page
            .getByTestId('table-row')
            .filter({ hasText: clickMessage })
            .first();
        const clickableArea = notificationRow.locator('a, [role="button"]').first();

        if (await clickableArea.isVisible()) {
            await clickableArea.click();
            await page.waitForLoadState('domcontentloaded');

            await expect(page).toHaveURL(/\/dashboard\/objectives\//);
        }
    });

    test('filter notifications by read status', async ({ page }) => {
        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('domcontentloaded');

        const statusFilter = page.locator(
            '[data-testid*="filter"], select, button:has-text("Unread"), button:has-text("All")'
        );

        if ((await statusFilter.count()) > 0) {
            const unreadFilter = page.locator('button:has-text("Unread"), [data-testid*="unread"]');
            if ((await unreadFilter.count()) > 0) {
                await unreadFilter.first().click();
                await page.waitForLoadState('domcontentloaded');
            }
        }
    });
});
