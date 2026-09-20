import { test, expect } from '../../fixtures/test-base';
import type { Page } from '@playwright/test';
import { loginUser } from '../../helpers/test-helpers';

test.describe.configure({ mode: 'serial' });

async function gotoSessions(page: Page): Promise<void> {
    await page.goto('/dashboard/sessions', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('sessions-page')).toBeVisible({ timeout: 15000 });
}

test.describe('Sessions', () => {
    test(
        'current session cannot be revoked from its own row',
        { tag: ['@REQ-AUTENTICACION-006', '@REQ-AUTENTICACION-007'] },
        async ({ authenticatedPage }) => {
            await gotoSessions(authenticatedPage);

            const currentBadge = authenticatedPage
                .getByTestId('session-status-badge-current')
                .first();
            await expect(currentBadge).toBeVisible({ timeout: 10000 });

            const currentRow = currentBadge.locator('xpath=ancestor::tr');
            await expect(currentRow.getByTestId('session-revoke-button')).toHaveCount(0);
        }
    );

    test(
        'can close all other sessions except current',
        { tag: ['@REQ-AUTENTICACION-006', '@REQ-AUTENTICACION-007', '@REQ-AUTENTICACION-008'] },
        async ({ isolatedAuthenticatedPage, isolatedTestUser, browser }) => {
            const secondContext = await browser.newContext();
            const secondPage = await secondContext.newPage();

            try {
                await loginUser(secondPage, isolatedTestUser.email, isolatedTestUser.password);
                await secondPage.goto('about:blank');
                await secondContext.clearCookies();

                await gotoSessions(isolatedAuthenticatedPage);

                const revokeButtons =
                    isolatedAuthenticatedPage.getByTestId('session-revoke-button');
                await expect
                    .poll(() => revokeButtons.count(), {
                        timeout: 15000,
                        intervals: [250, 500, 1000],
                    })
                    .toBeGreaterThanOrEqual(1);

                const revokeOtherButton = isolatedAuthenticatedPage.getByTestId(
                    'sessions-revoke-other-button'
                );
                await expect(revokeOtherButton).toBeEnabled({ timeout: 15000 });
                await revokeOtherButton.click();

                await expect
                    .poll(() => revokeButtons.count(), {
                        timeout: 15000,
                        intervals: [250, 500, 1000],
                    })
                    .toBe(0);
                await expect(
                    isolatedAuthenticatedPage.getByTestId('session-status-badge-current')
                ).toBeVisible();
            } finally {
                await secondContext.close();
            }
        }
    );
});
