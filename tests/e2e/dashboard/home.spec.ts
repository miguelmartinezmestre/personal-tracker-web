import { test, expect } from '../../fixtures/test-base';
import { expectWelcomeMessage } from '../../helpers/assertions';

test.describe('Dashboard Home', () => {
    test(
        'dashboard greets the user with an empty home stub',
        { tag: ['@REQ-DASHBOARD-001'] },
        async ({ authenticatedPage, testUser }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expectWelcomeMessage(authenticatedPage, testUser.username);
            await expect(authenticatedPage.getByTestId('dashboard-home-stub')).toBeVisible({
                timeout: 15000,
            });
            await expect(authenticatedPage.getByTestId('dashboard-home-empty')).toBeVisible();
        }
    );
});
