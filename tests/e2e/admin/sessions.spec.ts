import { expect, test } from '../../fixtures/admin-test-base';

test('admin can inspect sessions for a user', { tag: ['@REQ-ADMIN-004'] }, async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    const usersTable = page.getByTestId('admin-users-table');
    await expect(usersTable).toBeVisible({ timeout: 15000 });
    const userId =
        (
            await usersTable
                .getByTestId('table-row')
                .first()
                .getByTestId('table-cell')
                .first()
                .textContent()
        )?.trim() ?? '';
    expect(userId).not.toBe('');

    await page.goto('/dashboard/admin/sessions');
    await page.getByTestId('user-sessions-userid-input').fill(userId);
    await expect(page.getByTestId('table')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('table-row').first()).toBeVisible({ timeout: 15000 });
});
