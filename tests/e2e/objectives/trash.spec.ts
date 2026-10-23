import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';

test.describe('Objectives trash', () => {
    test(
        'a deleted objective goes to the trash, comes back, and is purged after confirming',
        {
            tag: [
                '@REQ-COLABORACION-002',
                '@REQ-NF-011',
                '@INH-PAP-01',
                '@INH-PAP-02',
                '@INH-PAP-03',
            ],
        },
        async ({ page }) => {
            const title = `Trashed ${randomUUID().substring(0, 8)}`;
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-target-input').fill('10');
            await page.getByTestId('objective-save-button').click();

            const row = page.getByTestId('objective-row-link').filter({ hasText: title });
            const trashRow = page.getByTestId('table-row').filter({ hasText: title });

            const deleteObjective = async () => {
                await row.click();
                await page.getByTestId('objective-delete-button').click();
                await page.getByTestId('delete-confirm-button').click();
                await expect(page).toHaveURL(/\/dashboard\/objectives(\?|$)/, { timeout: 15000 });
                await expect(row).toHaveCount(0, { timeout: 15000 });
            };

            await deleteObjective();
            await page.getByTestId('objectives-trash-link').click();
            await expect(page).toHaveURL(/\/dashboard\/objectives\/trash(\?|$)/);
            await trashRow.getByTestId('trash-restore-button').click();
            await expect(trashRow).toHaveCount(0, { timeout: 15000 });

            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await expect(row).toBeVisible({ timeout: 15000 });
            await deleteObjective();
            await page.getByTestId('objectives-trash-link').click();
            await trashRow.getByTestId('trash-purge-button').click();
            await page.getByTestId('delete-confirm-button').click();
            await expect(trashRow).toHaveCount(0, { timeout: 15000 });
            await expect(page.getByTestId('objectives-trash')).toContainText(/empty/i);
        }
    );
});
