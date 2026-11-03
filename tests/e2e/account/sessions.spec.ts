import { test, expect } from '../../fixtures/test-base';
import { loginUser } from '../../helpers/test-helpers';

test.describe('Sessions', () => {
    test(
        'lists the sessions and signs out every other one',
        { tag: ['@REQ-AUTENTICACION-006', '@REQ-AUTENTICACION-007', '@REQ-AUTENTICACION-008'] },
        async ({ browser, page, testUser }) => {
            const otherContext = await browser.newContext();

            try {
                const otherPage = await otherContext.newPage();
                await loginUser(otherPage, testUser.email);

                await page.goto('/dashboard/sessions', { waitUntil: 'domcontentloaded' });
                const rows = page.getByTestId('table-row');
                await expect(rows).toHaveCount(2, { timeout: 15000 });
                await expect(page.getByTestId('session-current')).toHaveCount(1);

                await page.getByTestId('sessions-revoke-others').click();
                await page.getByTestId('delete-confirm-button').click();
                await expect(rows).toHaveCount(1, { timeout: 15000 });

                await otherPage.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
                await expect(otherPage).toHaveURL(/\/login(\?|$)/, { timeout: 15000 });
            } finally {
                await otherContext.close();
            }
        }
    );
});
