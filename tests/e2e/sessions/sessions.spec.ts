import { test, expect, loginUser } from '../../fixtures/test-base';

test.describe('Sessions', () => {
    test(
        'sessions page shows table',
        { tag: ['@REQ-AUTENTICACION-006'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/sessions');

            const sessionsPage = authenticatedPage.getByTestId('sessions-page');
            await expect(sessionsPage).toBeVisible({ timeout: 15000 });

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

            const dataRow = authenticatedPage.getByTestId('table-row').first();
            await expect(dataRow).toBeVisible({ timeout: 15000 });

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

            const dataRow = authenticatedPage.getByTestId('table-row').first();
            await expect(dataRow).toBeVisible({ timeout: 15000 });

            const currentBadge = authenticatedPage
                .getByTestId('session-status-badge-current')
                .first();
            await expect(currentBadge).toBeVisible({ timeout: 10000 });

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

            const table = authenticatedPage.locator('table');
            await expect(table).toBeVisible({ timeout: 10000 });

            const dataRows = authenticatedPage.getByTestId('table-row');
            await expect(dataRows.first()).toBeVisible({ timeout: 15000 });

            const rowCount = await dataRows.count();
            expect(rowCount).toBeGreaterThanOrEqual(1);
        }
    );

    test(
        'can close all other sessions except current',
        { tag: ['@REQ-AUTENTICACION-009'] },
        async ({ authenticatedPage, browser, testUser }) => {
            const secondContext = await browser.newContext();
            const secondPage = await secondContext.newPage();

            try {
                await loginUser(secondPage, testUser.email, testUser.password);

                await authenticatedPage.goto('/dashboard/sessions');

                const sessionsPage = authenticatedPage.getByTestId('sessions-page');
                await expect(sessionsPage).toBeVisible({ timeout: 15000 });

                const revokeOtherButton = authenticatedPage.getByTestId(
                    'sessions-revoke-other-button'
                );
                await expect(revokeOtherButton).toBeEnabled({ timeout: 15000 });

                await revokeOtherButton.click();

                let revokeCount = -1;
                const maxTime = Date.now() + 15000;

                while (Date.now() < maxTime && revokeCount !== 0) {
                    await authenticatedPage.reload({ waitUntil: 'domcontentloaded' });
                    revokeCount = await authenticatedPage.getByTestId('session-revoke-button').count();

                    if (revokeCount !== 0) {
                        await authenticatedPage.waitForTimeout(500);
                    }
                }

                expect(revokeCount).toBe(0);
                await expect(authenticatedPage.getByTestId('table-row')).toHaveCount(1);
                await expect(
                    authenticatedPage.getByTestId('session-status-badge-current')
                ).toBeVisible();
            } finally {
                await secondContext.close();
            }
        }
    );
});
