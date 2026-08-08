import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/admin-test-base';
import { createTestUser } from '../../helpers/test-helpers';

async function findUserRow(page: Page, email: string) {
    await page.goto('/dashboard/admin/users');
    await expect(page.getByTestId('admin-users-table')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('admin-users-search-input').fill(email);
    const row = page.getByTestId('table-row').filter({ hasText: email }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    return row;
}

test.describe('Admin Users', () => {
    test(
        'non-admin users cannot access global administration',
        { tag: ['@REQ-ADMIN-001'] },
        async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            try {
                await createTestUser(page);
                await page.goto('/dashboard/admin/users');
                await expect
                    .poll(() => page.url(), { timeout: 10000 })
                    .not.toContain('/dashboard/admin/users');
            } finally {
                await context.close();
            }
        }
    );

    test(
        'admin can change a user role',
        { tag: ['@REQ-ADMIN-001', '@REQ-ADMIN-003'] },
        async ({ page, browser }) => {
            const userContext = await browser.newContext();
            const userPage = await userContext.newPage();
            const user = await createTestUser(userPage);
            await userContext.close();

            const row = await findUserRow(page, user.email);
            await row.getByTestId('user-edit-open').click();
            await page.getByTestId('user-edit-role-select').click();
            await page
                .getByRole('option', { name: /^(global admin|administrador global)$/i })
                .click();
            await page.getByTestId('user-edit-save-button').click();

            await expect(row).toContainText(/Global admin|Administrador global/, {
                timeout: 10000,
            });
        }
    );
});
