import type { Page } from '@playwright/test';
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

async function seedSystemNotification(page: Page): Promise<{ objectiveTitle: string }> {
    await ensureDefaultCategories(page);
    const objective = await createObjective(page, {
        title: `Notif Obj ${Date.now()}`,
        ensureCategories: false,
    });

    await openObjectiveDetailByTitle(page, objective.title);
    await openCreateProgressModal(page);
    await page.getByTestId('progress-value-input').fill('10');
    await page.getByTestId('progress-save-button').click();
    await expect(page.getByTestId('progress-value-input')).toHaveCount(0, { timeout: 15000 });

    await page.goto('/dashboard/notifications', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('table-row').filter({ hasText: objective.title })).toBeVisible({
        timeout: 15000,
    });

    return { objectiveTitle: objective.title };
}

test.describe('Notifications', () => {
    test(
        'mark notification as read',
        { tag: ['@REQ-NOTIFICACIONES-002', '@REQ-NOTIFICACIONES-003'] },
        async ({ page }) => {
            const { objectiveTitle } = await seedSystemNotification(page);

            const row = page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first();
            const markReadButton = row.getByTestId('notification-mark-read-button');
            await expect(markReadButton).toBeVisible();
            await markReadButton.click();

            await expect(markReadButton).toContainText(/unread|no leída/i, { timeout: 10000 });
        }
    );

    test('delete notification', { tag: ['@REQ-NOTIFICACIONES-003'] }, async ({ page }) => {
        const { objectiveTitle } = await seedSystemNotification(page);

        const row = page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first();
        await row.getByTestId('notification-delete-button').click();

        const confirmButton = page.getByTestId('delete-confirm-button');
        await expect(confirmButton.first()).toBeVisible({ timeout: 5000 });
        await confirmButton.first().click();

        await expect(row).toBeHidden({ timeout: 10000 });
    });

    test(
        'notification links to related objective',
        { tag: ['@REQ-NOTIFICACIONES-003'] },
        async ({ page }) => {
            const { objectiveTitle } = await seedSystemNotification(page);

            const notificationRow = page
                .getByTestId('table-row')
                .filter({ hasText: objectiveTitle })
                .first();
            await expect(notificationRow).toBeVisible();
            await notificationRow.locator('a, [role="button"]').first().click();

            await expect(page).toHaveURL(/\/dashboard\/objectives\//);
        }
    );
});
