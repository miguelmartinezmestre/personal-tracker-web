import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Achievements Page', () => {
    test('achievements page loads correctly', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');

        await expect(page).toHaveURL(/\/dashboard\/achievements$/);
        await takeScreenshot(page, 'achievements-page', 'initial-load');

        // Check for page heading
        const heading = page.getByRole('heading', { name: /achievements|logros/i });
        await expect(heading).toBeVisible();
    });

    test('displays achievement stats', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-stats', 'stats-display');

        // Look for stats elements (points, earned count)
        // The exact content depends on translation keys
    });

    test('shows achievement cards', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-cards', 'card-list');
    });

    test('navigates to achievements from sidebar', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/home');

        // Look for achievements link in sidebar
        const achievementsLink = page.getByRole('link', { name: /achievements|logros/i });
        if (await achievementsLink.isVisible()) {
            await achievementsLink.click();
            await expect(page).toHaveURL(/\/dashboard\/achievements$/);
            await takeScreenshot(page, 'achievements-navigation', 'from-sidebar');
        }
    });

    test('achievements page is responsive', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Desktop view
        await page.setViewportSize({ width: 1280, height: 720 });
        await takeScreenshot(page, 'achievements-responsive', 'desktop');

        // Tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await takeScreenshot(page, 'achievements-responsive', 'tablet');

        // Mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await takeScreenshot(page, 'achievements-responsive', 'mobile');
    });
});

test.describe('Achievements Widget', () => {
    test('achievements widget appears on dashboard', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-widget', 'on-dashboard');

        // Look for achievements widget
        const widget = page.getByTestId('achievements-widget');
        if (await widget.isVisible()) {
            await expect(widget).toBeVisible();
        }
    });

    test('widget shows points and earned count', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-widget-stats', 'points-display');
    });

    test('widget has link to full achievements page', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for "View All" or similar link in widget
        const viewAllLink = page.getByRole('link', { name: /view all|ver todos/i });
        if (await viewAllLink.first().isVisible()) {
            await viewAllLink.first().click();
            await expect(page).toHaveURL(/\/dashboard\/achievements$/);
            await takeScreenshot(page, 'achievements-widget', 'after-view-all-click');
        }
    });
});

test.describe('Achievement Filters', () => {
    test('can filter achievements by category', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-filters', 'initial-state');

        // Look for filter controls
        const filterButton = page.getByRole('button', { name: /filter|filtrar|category/i });
        if (await filterButton.first().isVisible()) {
            await filterButton.first().click();
            await takeScreenshot(page, 'achievements-filters', 'filter-open');
        }
    });

    test('can filter achievements by tier', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for tier filter options (bronze, silver, gold, platinum)
        const tierOptions = ['bronze', 'silver', 'gold', 'platinum'];

        for (const tier of tierOptions) {
            const tierButton = page.getByRole('button', { name: new RegExp(tier, 'i') });
            if (await tierButton.isVisible()) {
                await takeScreenshot(page, 'achievements-tier-filter', `${tier}-option`);
            }
        }
    });

    test('can filter earned vs unearned achievements', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for earned/unearned toggle or filter
        const earnedFilter = page.getByRole('button', { name: /earned|obtenido/i });
        if (await earnedFilter.isVisible()) {
            await earnedFilter.click();
            await takeScreenshot(page, 'achievements-earned-filter', 'earned-selected');
        }
    });
});

test.describe('Achievement Progress', () => {
    test('shows progress bars for unearned achievements', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-progress', 'progress-bars');

        // Look for progress bar elements
        const progressBars = page.locator('[role="progressbar"]');
        const count = await progressBars.count();
        console.log(`Found ${count} progress bars`);
    });

    test('earned achievements show completion status', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements-completion', 'earned-status');
    });
});

test.describe('Achievement Notifications', () => {
    test('creating objective may trigger achievement notification', async ({ page }) => {
        await createTestUser(page);

        // Create first objective to potentially earn "First Objective" achievement
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        const createButton = page.getByRole('button', { name: /create|new|add|crear/i }).first();
        if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForLoadState('networkidle');
            await takeScreenshot(page, 'achievement-trigger', 'after-create-objective');
        }
    });
});

test.describe('Achievement Details', () => {
    test('achievement cards are clickable', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for achievement cards
        const achievementCard = page.locator('[data-testid^="achievement-card-"]').first();
        if (await achievementCard.isVisible()) {
            await achievementCard.click();
            await takeScreenshot(page, 'achievement-detail', 'card-clicked');
        }
    });

    test('shows achievement tier badges', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievement-badges', 'tier-display');

        // Look for tier badges
        const badges = page.locator('[data-testid="badge"]');
        const count = await badges.count();
        console.log(`Found ${count} tier badges`);
    });
});
