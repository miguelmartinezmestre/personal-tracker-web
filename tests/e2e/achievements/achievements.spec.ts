import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';

test.describe('Achievements', () => {
    test(
        'a first objective unlocks achievements, shown in the gallery, the dashboard and a notification',
        {
            tag: ['@REQ-LOGROS-001', '@REQ-LOGROS-005', '@REQ-LOGROS-006', '@REQ-LOGROS-007'],
        },
        async ({ page }) => {
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-create-open').click();
            await page
                .getByTestId('objective-title-input')
                .fill(`Walk ${randomUUID().slice(0, 8)}`);
            await page.getByTestId('objective-target-input').fill('10');
            await page.getByTestId('objective-save-button').click();
            await expect(page.getByTestId('objective-row-link')).toHaveCount(1, { timeout: 15000 });

            await page.goto('/dashboard/achievements', { waitUntil: 'domcontentloaded' });

            const firstStep = page
                .getByTestId('achievement-card')
                .filter({ hasText: 'First step' });

            await expect(firstStep).toHaveAttribute('data-earned', 'true', { timeout: 15000 });
            await expect(page.getByTestId('user-points')).toHaveText('10');
            await expect(page.getByTestId('organization-points')).toHaveText('15');
            await expect(
                page.getByTestId('achievement-card').filter({ hasText: 'Planner' })
            ).toContainText('1 / 5');

            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('achievements-widget')).toContainText('First step', {
                timeout: 15000,
            });

            await page.goto('/dashboard/notifications', { waitUntil: 'domcontentloaded' });
            await expect(
                page
                    .getByTestId('notification-row')
                    .filter({ hasText: 'You unlocked the achievement "First step"' })
            ).toBeVisible({ timeout: 15000 });
        }
    );
});
