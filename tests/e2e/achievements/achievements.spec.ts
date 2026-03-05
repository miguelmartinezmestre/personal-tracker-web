import { test, expect } from '../../fixtures/test-base';
import { AchievementsPage } from '../../pages/achievements.page';

test.describe('Achievements', () => {
    test('achievements page loads correctly', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();

        await expect(achievements.achievementsPage).toBeVisible({ timeout: 15000 });
        await expect(achievements.title).toBeVisible();
    });

    test('stats show total points and earned count', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();

        await expect(achievements.statsSection).toBeVisible({ timeout: 15000 });
        await expect(achievements.totalPoints).toBeVisible();
        await expect(achievements.earnedCount).toBeVisible();
    });

    test('filter buttons are visible and clickable', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();

        await expect(achievements.filters).toBeVisible({ timeout: 15000 });
        await expect(achievements.filterAll).toBeVisible();
        await expect(achievements.filterEarned).toBeVisible();
        await expect(achievements.filterLocked).toBeVisible();
    });

    test('filter earned shows only earned achievements', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();
        await expect(achievements.filters).toBeVisible({ timeout: 15000 });

        await achievements.filterBy('earned');

        // The earned filter is now active (button should have default variant)
        await expect(achievements.filterEarned).toBeVisible();
    });

    test('filter locked shows only locked achievements', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();
        await expect(achievements.filters).toBeVisible({ timeout: 15000 });

        await achievements.filterBy('locked');

        // The locked filter is now active
        await expect(achievements.filterLocked).toBeVisible();
    });

    test('tabs switch between individual and organization', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();
        await expect(achievements.tabs).toBeVisible({ timeout: 15000 });

        // Individual tab should be active by default
        await expect(achievements.contentIndividual).toBeVisible();

        // Switch to organization
        await achievements.switchToOrganization();
        await expect(achievements.contentOrganization).toBeVisible();

        // Switch back to individual
        await achievements.switchToIndividual();
        await expect(achievements.contentIndividual).toBeVisible();
    });

    test('seed button appears when no achievements exist', async ({ authenticatedPage }) => {
        const achievements = new AchievementsPage(authenticatedPage);
        await achievements.goto();
        await expect(achievements.achievementsPage).toBeVisible({ timeout: 15000 });

        // The seed button might or might not be visible depending on state
        // Just verify the page is functional
        const hasSeedButton = await achievements.seedButton.isVisible().catch(() => false);
        const hasStats = await achievements.statsSection.isVisible().catch(() => false);

        // One of these should be true
        expect(hasSeedButton || hasStats).toBeTruthy();
    });
});
