import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';

test.describe('Notifications', () => {
    test(
        'notifies a completed objective as chosen, then marks and deletes notifications',
        {
            tag: [
                '@REQ-NOTIFICACIONES-001',
                '@REQ-NOTIFICACIONES-002',
                '@INH-NOT-04',
                '@INH-NOT-07',
            ],
        },
        async ({ page }) => {
            const title = `Swim ${randomUUID().substring(0, 8)}`;

            await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });

            for (const type of ['progress', 'achievement']) {
                const toggle = page.getByTestId(`notification-preference-${type}`);
                await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 15000 });
                await toggle.click();
                await expect(toggle).toHaveAttribute('aria-checked', 'false');
            }

            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('notification-preference-progress')).toHaveAttribute(
                'aria-checked',
                'false',
                { timeout: 15000 }
            );

            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-target-input').fill('4');
            await page.getByTestId('objective-save-button').click();
            await page.getByTestId('objective-row-link').filter({ hasText: title }).click();

            await page.getByTestId('progress-value-input').fill('2');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('objective-progress-percent')).toContainText('50', {
                timeout: 15000,
            });
            await page.getByTestId('progress-value-input').fill('2');
            await page.getByTestId('progress-save-button').click();

            await expect(page.getByTestId('objective-completed-notice')).toBeVisible({
                timeout: 15000,
            });
            await expect(page.getByTestId('notification-bell-count')).toHaveText('1', {
                timeout: 15000,
            });

            await page.getByTestId('notification-bell').click();
            const rows = page.getByTestId('notification-row');
            await expect(rows).toHaveCount(1, { timeout: 15000 });
            await expect(rows.first()).toContainText(`Objective "${title}" has been completed.`);

            await page.getByTestId('notifications-mark-all-read').click();
            await expect(rows.first()).toHaveAttribute('data-read', 'true', { timeout: 15000 });
            await expect(page.getByTestId('notification-bell-count')).toHaveCount(0);

            await rows.first().getByTestId('notification-toggle-read').click();
            await expect(page.getByTestId('notification-bell-count')).toHaveText('1', {
                timeout: 15000,
            });

            await rows.first().getByTestId('notification-delete').click();
            await expect(page.getByTestId('notifications-empty')).toBeVisible({ timeout: 15000 });
        }
    );
});
