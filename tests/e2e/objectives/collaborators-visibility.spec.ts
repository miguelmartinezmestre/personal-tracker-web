import { test, expect } from '../../fixtures/test-base';
import { createObjective } from '../../helpers/test-helpers';

test.describe('Objective visibility creation', () => {
    test(
        'create private objective by default',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-COLABORACION-004'] },
        async ({ page }) => {
            const title = `Private objective ${Date.now()}`;
            await createObjective(page, {
                title,
                targetValue: 100,
            });

            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            const row = page.getByTestId('table-row').filter({ hasText: title }).first();
            await expect(row).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'create organization-visible objective',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-COLABORACION-004'] },
        async ({ page }) => {
            const title = `Org-wide objective ${Date.now()}`;
            await createObjective(page, {
                title,
                targetValue: 100,
                visibility: 'organization',
            });

            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            const row = page.getByTestId('table-row').filter({ hasText: title }).first();
            await expect(row).toBeVisible({ timeout: 10000 });
        }
    );
});
