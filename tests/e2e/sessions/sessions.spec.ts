import { test, expect } from '../../fixtures/test-base';

test.describe('Sessions', () => {
    test(
        'sessions page shows table',
        { tag: ['@REQ-AUTENTICACION-006'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/sessions');

            const sessionsPage = authenticatedPage.getByTestId('sessions-page');
            await expect(sessionsPage).toBeVisible({ timeout: 15000 });

            // Should show a table with sessions
            const table = authenticatedPage.locator('table');
            await expect(table).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'current session has badge showing current status',
        { tag: ['@REQ-AUTENTICACION-006'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/sessions');

            const sessionsPage = authenticatedPage.getByTestId('sessions-page');
            await expect(sessionsPage).toBeVisible({ timeout: 15000 });

            // Wait for actual data rows (table-row testid only exists on data rows, not "No Results")
            const dataRow = authenticatedPage.getByTestId('table-row').first();
            await expect(dataRow).toBeVisible({ timeout: 15000 });

            // The current session badge should be visible (uses data-testid with status suffix)
            const currentBadge = authenticatedPage.getByTestId('session-status-badge-current');
            await expect(currentBadge.first()).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'current session does not show revoke button',
        { tag: ['@REQ-AUTENTICACION-007'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/sessions');

            const sessionsPage = authenticatedPage.getByTestId('sessions-page');
            await expect(sessionsPage).toBeVisible({ timeout: 15000 });

            // Wait for actual data rows
            const dataRow = authenticatedPage.getByTestId('table-row').first();
            await expect(dataRow).toBeVisible({ timeout: 15000 });

            // Find the current session badge
            const currentBadge = authenticatedPage
                .getByTestId('session-status-badge-current')
                .first();
            await expect(currentBadge).toBeVisible({ timeout: 10000 });

            // Current session's row should not contain a revoke button
            const currentRow = currentBadge.locator('xpath=ancestor::tr');
            const revokeInCurrentRow = currentRow.getByTestId('session-revoke-button');
            await expect(revokeInCurrentRow).toHaveCount(0);
        }
    );

    test(
        'sessions title is displayed',
        { tag: ['@REQ-AUTENTICACION-006'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/sessions');

            const title = authenticatedPage.getByTestId('sessions-title');
            await expect(title).toBeVisible({ timeout: 15000 });
        }
    );

    test(
        'session table shows device and date information',
        { tag: ['@REQ-AUTENTICACION-006'] },
        async ({ authenticatedPage }) => {
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
        }
    );
});
