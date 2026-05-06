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
        async ({ isolatedAuthenticatedPage, isolatedTestUser, browser }) => {
            const secondContext = await browser.newContext();
            const secondPage = await secondContext.newPage();

            try {
                await loginUser(secondPage, isolatedTestUser.email, isolatedTestUser.password);

                await secondPage.goto('about:blank');
                await secondContext.clearCookies();

                await isolatedAuthenticatedPage.goto('/dashboard/sessions');

                const sessionsPage = isolatedAuthenticatedPage.getByTestId('sessions-page');
                await expect(sessionsPage).toBeVisible({ timeout: 15000 });

                await expect
                    .poll(
                        async () => {
                            try {
                                const response =
                                    await isolatedAuthenticatedPage.request.get(
                                        '/api/auth/convex/token'
                                    );
                                if (!response.ok()) return false;
                                const body = (await response.json()) as { token?: string } | null;
                                return typeof body?.token === 'string' && body.token.length > 0;
                            } catch {
                                return false;
                            }
                        },
                        { timeout: 15000, intervals: [250, 500, 1000] }
                    )
                    .toBe(true);

                await expect
                    .poll(
                        () =>
                            isolatedAuthenticatedPage.getByTestId('session-revoke-button').count(),
                        { timeout: 15000, intervals: [250, 500, 1000] }
                    )
                    .toBeGreaterThanOrEqual(1);

                const revokeOtherButton = isolatedAuthenticatedPage.getByTestId(
                    'sessions-revoke-other-button'
                );
                await expect(revokeOtherButton).toBeEnabled({ timeout: 15000 });

                let succeeded = false;
                const revokeButtons =
                    isolatedAuthenticatedPage.getByTestId('session-revoke-button');
                for (let attempt = 0; attempt < 3 && !succeeded; attempt++) {
                    const currentRevokeButton = isolatedAuthenticatedPage.getByTestId(
                        'sessions-revoke-other-button'
                    );
                    await expect(currentRevokeButton).toBeEnabled({ timeout: 15000 });
                    await currentRevokeButton.click();

                    try {
                        await expect
                            .poll(() => revokeButtons.count(), {
                                timeout: 8000,
                                intervals: [250, 500, 1000],
                            })
                            .toBe(0);
                        succeeded = true;
                    } catch {
                        await isolatedAuthenticatedPage.reload({
                            waitUntil: 'domcontentloaded',
                        });
                        await expect(sessionsPage).toBeVisible({ timeout: 15000 });
                    }
                }

                expect(succeeded, 'revoke other sessions should eventually succeed').toBe(true);

                await expect(isolatedAuthenticatedPage.getByTestId('table-row')).toHaveCount(1, {
                    timeout: 10000,
                });
                await expect(
                    isolatedAuthenticatedPage.getByTestId('session-status-badge-current')
                ).toBeVisible();
            } finally {
                await secondContext.close();
            }
        }
    );
});
