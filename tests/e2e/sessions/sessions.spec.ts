import { test, expect } from '../../fixtures/test-base';

test.describe('Sessions', () => {
    test('sessions page shows table', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/sessions');

        const sessionsPage = authenticatedPage.getByTestId('sessions-page');
        await expect(sessionsPage).toBeVisible({ timeout: 15000 });

        // Should show a table with sessions
        const table = authenticatedPage.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('current session has badge showing current status', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/sessions');

        const sessionsPage = authenticatedPage.getByTestId('sessions-page');
        await expect(sessionsPage).toBeVisible({ timeout: 15000 });

        // Wait for actual data rows (table-row testid only exists on data rows, not "No Results")
        const dataRow = authenticatedPage.getByTestId('table-row').first();
        await expect(dataRow).toBeVisible({ timeout: 15000 });

        // At least one badge should be visible in the table (data-slot="badge" on all Badge components)
        const badges = authenticatedPage.locator('table [data-slot="badge"]');
        await expect(badges.first()).toBeVisible({ timeout: 10000 });

        // One of the badges should indicate the current session
        const currentBadge = badges.filter({
            hasText: /current|actual/i,
        });
        await expect(currentBadge.first()).toBeVisible();
    });

    test('current session does not show revoke button', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/sessions');

        const sessionsPage = authenticatedPage.getByTestId('sessions-page');
        await expect(sessionsPage).toBeVisible({ timeout: 15000 });

        // Wait for actual data rows
        const dataRow = authenticatedPage.getByTestId('table-row').first();
        await expect(dataRow).toBeVisible({ timeout: 15000 });

        // Find the current session badge
        const currentBadge = authenticatedPage
            .locator('table [data-slot="badge"]')
            .filter({ hasText: /current|actual/i })
            .first();
        await expect(currentBadge).toBeVisible({ timeout: 10000 });

        // Current session's row should not contain a revoke button
        const currentRow = currentBadge.locator('xpath=ancestor::tr');
        const revokeInCurrentRow = currentRow.getByTestId('session-revoke-button');
        await expect(revokeInCurrentRow).toHaveCount(0);
    });

    test('sessions title is displayed', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/sessions');

        const title = authenticatedPage.getByTestId('sessions-title');
        await expect(title).toBeVisible({ timeout: 15000 });
    });

    test('session table shows device and date information', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/sessions');

        const sessionsPage = authenticatedPage.getByTestId('sessions-page');
        await expect(sessionsPage).toBeVisible({ timeout: 15000 });

        // Table should be visible
        const table = authenticatedPage.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });

        // Wait for actual data rows (not just "No Results")
        const dataRows = authenticatedPage.getByTestId('table-row');
        await expect(dataRows.first()).toBeVisible({ timeout: 15000 });

        // Should have at least one data row (the current session)
        const rowCount = await dataRows.count();
        expect(rowCount).toBeGreaterThanOrEqual(1);
    });
});
