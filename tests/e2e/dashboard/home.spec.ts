import { test, expect } from '../../fixtures/test-base';
import { expectWelcomeMessage } from '../../helpers/assertions';

test.describe('Dashboard Home', () => {
    test('dashboard shows welcome message with username', async ({
        authenticatedPage,
        testUser,
    }) => {
        await authenticatedPage.goto('/dashboard/home');
        await authenticatedPage.waitForLoadState('domcontentloaded');

        await expectWelcomeMessage(authenticatedPage, testUser.username);
    });

    test('stat cards show objective counts', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');

        const statsGrid = authenticatedPage.getByTestId('dashboard-stats');
        await expect(statsGrid).toBeVisible({ timeout: 15000 });

        // Stat cards should be visible (even if values are 0)
        const statCards = authenticatedPage.locator('[data-testid^="stat-card-"]');
        await expect(statCards.first()).toBeVisible({ timeout: 10000 });

        // Should have at least 2 stat cards (active + completed)
        const count = await statCards.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('monthly progress chart renders', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');

        const chart = authenticatedPage.getByTestId('monthly-progress-chart');
        await expect(chart).toBeVisible({ timeout: 15000 });
    });

    test('top objectives chart renders', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');

        const chart = authenticatedPage.getByTestId('top-objectives-chart');
        await expect(chart).toBeVisible({ timeout: 15000 });
    });

    test('upcoming deadlines section is visible', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');

        const deadlines = authenticatedPage.getByTestId('upcoming-deadlines');
        await expect(deadlines).toBeVisible({ timeout: 15000 });
    });

    test('recent activity section is visible', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/home');

        const activity = authenticatedPage.getByTestId('recent-activity');
        await expect(activity).toBeVisible({ timeout: 15000 });
    });
});
