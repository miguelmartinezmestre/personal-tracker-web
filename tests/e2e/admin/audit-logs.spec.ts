import { expect, test } from '../../fixtures/admin-test-base';
import { createObjective } from '../../helpers/test-helpers';

test(
    'creating an objective produces an audit entry',
    { tag: ['@REQ-ADMIN-005', '@REQ-NF-004'] },
    async ({ page }) => {
        await createObjective(page, { title: `Audit objective ${Date.now()}` });
        await page.goto('/dashboard/admin/audit');

        await expect(page.getByTestId('admin-audit-title')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('table-row').first()).toBeVisible({ timeout: 15000 });
    }
);
