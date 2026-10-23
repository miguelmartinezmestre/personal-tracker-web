import { randomUUID } from 'crypto';
import { expect, test } from '@playwright/test';
import { createTestUser } from '../../helpers/test-helpers';

// Runs signed in as the global admin created by the setup project.
test.describe('Administration', () => {
    test(
        'bans a user for a while, closes their sessions, unbans them and logs it',
        {
            tag: [
                '@REQ-ROLES-002',
                '@REQ-ADMIN-001',
                '@REQ-ADMIN-002',
                '@REQ-ADMIN-004',
                '@REQ-ADMIN-005',
            ],
        },
        async ({ browser, page }) => {
            const userContext = await browser.newContext();

            try {
                const userPage = await userContext.newPage();
                const user = await createTestUser(userPage);
                await expect(userPage.getByTestId('sidebar-nav-admin')).toHaveCount(0);

                await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
                await expect(page.getByTestId('sidebar-nav-admin')).toBeVisible({ timeout: 15000 });
                await page.getByTestId('admin-users-search').fill(user.email);
                const row = page.getByTestId('table-row').filter({ hasText: user.email });
                await expect(row).toHaveCount(1, { timeout: 15000 });

                await row.getByTestId('admin-sessions-open').click();
                await expect(page.getByTestId('admin-sessions-list').locator('li')).toHaveCount(1, {
                    timeout: 15000,
                });
                await page.keyboard.press('Escape');

                await row.getByTestId('admin-ban-open').click();
                await page.getByTestId('admin-ban-duration').click();
                await page.getByRole('option', { name: '7 days' }).click();
                await page.getByTestId('admin-ban-submit').click();
                await expect(row.getByTestId('admin-user-banned')).toContainText('Banned until', {
                    timeout: 15000,
                });

                await userPage.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
                await expect(userPage).toHaveURL(/\/login(\?|$)/, { timeout: 15000 });

                await row.getByTestId('admin-unban-button').click();
                await expect(row.getByTestId('admin-user-banned')).toHaveCount(0, {
                    timeout: 15000,
                });

                await page.getByTestId('admin-audit-type').click();
                await page.getByRole('option', { name: 'Users' }).click();
                await expect(page.getByTestId('admin-audit')).toContainText('user.banned', {
                    timeout: 15000,
                });
            } finally {
                await userContext.close();
            }
        }
    );

    test(
        'edits the platform category catalog',
        { tag: ['@INH-ADM-07', '@REQ-CATEGORIAS-002'] },
        async ({ page }) => {
            const name = `Zeta ${randomUUID().substring(0, 8)}`;
            const renamed = `${name} renamed`;
            await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
            const catalog = page.getByTestId('admin-categories');

            await catalog.getByTestId('category-create-open').click();
            await page.getByTestId('category-name-input').fill(name);
            await page.getByTestId('category-save-button').click();
            const row = catalog.getByTestId('category-row').filter({ hasText: name });
            await expect(row).toBeVisible({ timeout: 15000 });

            await row.getByTestId('category-edit-button').click();
            await page.getByTestId('category-name-input').fill(renamed);
            await page.getByTestId('category-save-button').click();
            const renamedRow = catalog.getByTestId('category-row').filter({ hasText: renamed });
            await expect(renamedRow).toBeVisible({ timeout: 15000 });

            await renamedRow.getByTestId('category-delete-button').click();
            await page.getByTestId('delete-confirm-button').click();
            await expect(renamedRow).toHaveCount(0, { timeout: 15000 });
        }
    );
});
