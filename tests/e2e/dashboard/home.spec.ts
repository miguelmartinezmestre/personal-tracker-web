import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';

test.describe('Dashboard Home', () => {
    test(
        'summarises the objectives: ranking, deadlines with days left and recent activity',
        {
            tag: [
                '@REQ-DASHBOARD-001',
                '@REQ-DASHBOARD-002',
                '@REQ-DASHBOARD-004',
                '@REQ-DASHBOARD-005',
                '@REQ-DASHBOARD-006',
            ],
        },
        async ({ page }) => {
            const title = `Dashboard goal ${randomUUID().substring(0, 8)}`;
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-target-input').fill('10');
            await page.getByTestId('objective-deadline-input').fill('in 3 days');
            await page.getByTestId('objective-save-button').click();
            await page.getByTestId('objective-row-link').filter({ hasText: title }).click();
            await page.getByTestId('progress-value-input').fill('4');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('objective-progress-percent')).toContainText('40', {
                timeout: 15000,
            });

            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('dashboard-stats')).toBeVisible({ timeout: 15000 });
            const deadlines = page.getByTestId('dashboard-upcoming-deadlines');
            await expect(deadlines).toContainText(title);
            await expect(deadlines.getByTestId('deadline-state-soon')).toHaveText('3 days left');
            await expect(
                page
                    .getByTestId('dashboard-activity')
                    .locator('div', { hasText: 'Progress updates' })
                    .locator('dd')
            ).toHaveText('1');
            await expect(page.getByRole('table', { name: 'Top Objectives' })).toContainText(title);
        }
    );
});
