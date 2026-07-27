import { test, expect } from '../../fixtures/test-base';
import { expectWelcomeMessage } from '../../helpers/assertions';

test.describe('Dashboard Home', () => {
    test(
        'dashboard greets the user and renders summary cards',
        { tag: ['@REQ-DASHBOARD-001'] },
        async ({ authenticatedPage, testUser }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expectWelcomeMessage(authenticatedPage, testUser.username);

            const statsGrid = authenticatedPage.getByTestId('dashboard-stats');
            await expect(statsGrid).toBeVisible({ timeout: 15000 });
            await expect(
                authenticatedPage.locator('[data-testid^="stat-card-"]').first()
            ).toBeVisible({
                timeout: 10000,
            });
        }
    );

    test(
        'dashboard renders charts and activity sections',
        {
            tag: [
                '@REQ-DASHBOARD-002',
                '@REQ-DASHBOARD-003',
                '@REQ-DASHBOARD-004',
                '@REQ-DASHBOARD-005',
                '@REQ-DASHBOARD-006',
                '@REQ-PROGRESO-004',
            ],
        },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');

            await expect(authenticatedPage.getByTestId('monthly-progress-chart')).toBeVisible({
                timeout: 15000,
            });
            await expect(authenticatedPage.getByTestId('top-objectives-chart')).toBeVisible({
                timeout: 15000,
            });
            await expect(authenticatedPage.getByTestId('upcoming-deadlines')).toBeVisible({
                timeout: 15000,
            });
            await expect(authenticatedPage.getByTestId('recent-activity')).toBeVisible({
                timeout: 15000,
            });
        }
    );
});
