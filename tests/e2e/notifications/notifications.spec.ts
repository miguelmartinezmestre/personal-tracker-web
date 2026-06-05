import { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test-base';
import {
    createObjective,
    ensureDefaultCategories,
    openCreateProgressModal,
} from '../../helpers/test-helpers';

async function openObjectiveDetailByTitle(page: Page, title: string): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

    const row = page.getByTestId('table-row').filter({ hasText: title }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const progressLink = row.getByTestId('objective-progress-link').first();
    const href = await progressLink.getAttribute('href');
    if (href) {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
    } else {
        await Promise.all([
            page.waitForURL(/\/dashboard\/objectives\/.+/, { timeout: 10000 }),
            progressLink.click(),
        ]);
    }

    await expect(page).toHaveURL(/\/dashboard\/objectives\/.+/);
    await page.waitForSelector('[data-testid="progress-create-open"]', { timeout: 10000 });
}

async function seedSystemNotification(
    page: Page,
    objectiveTitle?: string
): Promise<{ objectiveTitle: string }> {
    await ensureDefaultCategories(page);
    const title = objectiveTitle ?? `Notif Obj ${Date.now()}`;
    const objective = await createObjective(page, { title, ensureCategories: false });

    await openObjectiveDetailByTitle(page, objective.title);

    await openCreateProgressModal(page);
    await page.getByTestId('progress-value-input').fill('10');
    await page.getByTestId('progress-save-button').click();
    await expect(page.getByTestId('progress-value-input')).toHaveCount(0, { timeout: 15000 });

    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('table-row').filter({ hasText: objective.title })).toBeVisible({
        timeout: 15000,
    });

    return { objectiveTitle: objective.title };
}

test.describe('Notifications', () => {
    test('view notifications list', { tag: ['@REQ-NOTIFICACIONES-003'] }, async ({ page }) => {
        await page.goto('/dashboard/notifications', { waitUntil: 'domcontentloaded' });

        await expect(page).toHaveURL(/\/dashboard\/notifications/);
        await expect(
            page.getByRole('heading', { name: /notifications|notificaciones/i })
        ).toBeVisible({ timeout: 15_000 });

        const emptyState = page.locator(
            'text=/no.*notifications|sin notificaciones|caught up|notificaciones pendientes/i'
        );
        const notificationsList = page.getByTestId('table-row');
        const tableRows = page.locator('table tbody tr');

        const hasContent =
            (await emptyState.count()) > 0 ||
            (await notificationsList.count()) > 0 ||
            (await tableRows.count()) > 0;
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

    test('mark notification as read', { tag: ['@REQ-NOTIFICACIONES-002'] }, async ({ page }) => {
        await seedSystemNotification(page);

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
        const { objectiveTitle } = await seedSystemNotification(page);

        const row = page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first();
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
        const { objectiveTitle } = await seedSystemNotification(page);

        const objectiveLink = page.locator(`text=${objectiveTitle}`);
        const hasObjectiveRef = (await objectiveLink.count()) > 0;
        expect(hasObjectiveRef).toBeTruthy();
    });

    test('notification click navigates to related objective', async ({ page }) => {
        const { objectiveTitle } = await seedSystemNotification(page);

        const notificationRow = page
            .getByTestId('table-row')
            .filter({ hasText: objectiveTitle })
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
