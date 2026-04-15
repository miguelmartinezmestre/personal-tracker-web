import { test, expect } from '../../fixtures/test-base';
import { expectWelcomeMessage } from '../../helpers/assertions';

test.describe('Dashboard Home', () => {
    test(
        'dashboard shows welcome message with username',
        { tag: ['@REQ-DASHBOARD-001'] },
        async ({ authenticatedPage, testUser }) => {
            await authenticatedPage.goto('/dashboard/home');
            await authenticatedPage.waitForLoadState('domcontentloaded');

            await expectWelcomeMessage(authenticatedPage, testUser.username);
        }
    );

    test(
        'stat cards show objective counts',
        { tag: ['@REQ-DASHBOARD-001'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');

            const statsGrid = authenticatedPage.getByTestId('dashboard-stats');
            await expect(statsGrid).toBeVisible({ timeout: 15000 });

            const statCards = authenticatedPage.locator('[data-testid^="stat-card-"]');
            await expect(statCards.first()).toBeVisible({ timeout: 10000 });

            const count = await statCards.count();
            expect(count).toBeGreaterThanOrEqual(2);
        }
    );

    test(
        'monthly progress chart renders',
        { tag: ['@REQ-DASHBOARD-003'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');

            const chart = authenticatedPage.getByTestId('monthly-progress-chart');
            await expect(chart).toBeVisible({ timeout: 15000 });
        }
    );

    test(
        'top objectives chart renders',
        { tag: ['@REQ-DASHBOARD-002', '@REQ-PROGRESO-004'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');

            const chart = authenticatedPage.getByTestId('top-objectives-chart');
            await expect(chart).toBeVisible({ timeout: 15000 });
        }
    );

    test(
        'upcoming deadlines section is visible',
        { tag: ['@REQ-DASHBOARD-004', '@REQ-DASHBOARD-006'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');

            const deadlines = authenticatedPage.getByTestId('upcoming-deadlines');
            await expect(deadlines).toBeVisible({ timeout: 15000 });
        }
    );

    test(
        'recent activity section is visible',
        { tag: ['@REQ-DASHBOARD-007'] },
        async ({ authenticatedPage }) => {
            await authenticatedPage.goto('/dashboard/home');

            const activity = authenticatedPage.getByTestId('recent-activity');
            await expect(activity).toBeVisible({ timeout: 15000 });
        }
    );
});
