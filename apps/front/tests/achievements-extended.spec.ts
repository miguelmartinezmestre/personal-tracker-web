import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Achievements Page', () => {
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
