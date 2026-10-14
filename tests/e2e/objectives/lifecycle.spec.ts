import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';

test.describe('Objectives', () => {
    test(
        'create an objective, log and edit progress, then delete it',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-OBJETIVOS-006', '@REQ-OBJETIVOS-007'] },
        async ({ page }) => {
            const title = `Read books ${randomUUID().substring(0, 8)}`;
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-start-input').fill('0');
            await page.getByTestId('objective-target-input').fill('10');
            await page.getByTestId('objective-save-button').click();

            const row = page.getByTestId('objective-row-link').filter({ hasText: title });
            await expect(row).toBeVisible({ timeout: 15000 });
            await row.click();
            await expect(page.getByTestId('objective-detail-title')).toHaveText(title, {
                timeout: 15000,
            });

            await page.getByTestId('progress-value-input').fill('4');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('progress-entry-value')).toContainText('4', {
                timeout: 15000,
            });
            await expect(page.getByTestId('objective-progress-percent')).toContainText('40');

            await page.getByTestId('progress-edit-open').click();
            await page.getByTestId('progress-edit-value-input').fill('6');
            await page.getByTestId('progress-edit-save-button').click();
            await expect(page.getByTestId('objective-progress-percent')).toContainText('60', {
                timeout: 15000,
            });

            await page.getByTestId('objective-delete-button').click();
            await page.getByTestId('delete-confirm-button').click();
            await expect(page).toHaveURL(/\/dashboard\/objectives(?:\?|$)/, { timeout: 15000 });
            await expect(page.getByTestId('objectives-title')).toBeVisible();
            await expect(row).toHaveCount(0, { timeout: 15000 });
        }
    );
});
