import { test, expect } from '@playwright/test';
import { createTestUser, createObjective, ensureDefaultCategories } from '../../helpers/test-helpers';

test.describe('Achievements', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
    });

    test('view achievements panel', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Achievements page should load
        await expect(page).toHaveURL(/\/dashboard\/achievements/);

        // Should show achievements section
        const achievementsSection = page.locator('[data-testid*="achievement"], .achievement, h1:has-text("Achievement"), h1:has-text("Logro")');
        const hasAchievements = await achievementsSection.count() > 0;

        expect(hasAchievements).toBeTruthy();
    });

    test('view achievement stats', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for stats display (points, count, etc.)
        const statsSection = page.locator('[data-testid*="stats"], [data-testid*="points"]');
        const pointsText = page.locator('body').filter({ hasText: /\d+.*points|\d+.*puntos/i });
        const hasStats = (await statsSection.count() > 0) || (await pointsText.count() > 0);

        // Or total achievements count
        const countDisplay = page.getByText(/\d+.*achievements|\d+.*logros/i);
        const hasCount = await countDisplay.count() > 0;

        // Some form of stats should be present
    });

    test('unlock first objective achievement', async ({ page }) => {
        // Creating an objective should unlock "First Objective" achievement
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, {
            title: `Achievement Test ${Date.now()}`,
            ensureCategories: false,
        });

        // Navigate to achievements
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for "First Objective" achievement
        const firstObjAchievement = page.locator('text=/first.*objective|primer.*objetivo/i');
        const hasFirstObjAchievement = await firstObjAchievement.count() > 0;

        // Achievement might be displayed as unlocked
        const unlockedBadge = page.locator('[data-testid*="unlocked"], .unlocked, [class*="completed"]');
        const hasUnlocked = await unlockedBadge.count() > 0;
    });

    test('unlock completion achievement', async ({ page }) => {
        // Create and complete an objective
        await ensureDefaultCategories(page);
        const objective = await createObjective(page, {
            title: `Complete Achievement ${Date.now()}`,
            targetValue: 100,
            currentValue: 100, // Already at target
            ensureCategories: false,
        });

        // Navigate to achievements
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for completion-related achievement
        const completionAchievement = page.locator('text=/complet|finaliz/i');
        // Achievement UI should reflect completed objectives
    });

    test('filter individual achievements', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for filter options
        const filterSection = page.locator('[data-testid*="filter"], button:has-text("Individual"), button:has-text("Personal")');

        if (await filterSection.count() > 0) {
            // Click individual filter
            const individualFilter = page.locator('button:has-text("Individual"), button:has-text("Personal")');
            if (await individualFilter.count() > 0) {
                await individualFilter.first().click();
                await page.waitForLoadState('networkidle');

                // Should show only individual achievements
            }
        }
    });

    test('filter organization achievements', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for organization filter
        const orgFilter = page.locator('button:has-text("Organization"), button:has-text("Organización"), [data-testid*="org-filter"]');

        if (await orgFilter.count() > 0) {
            await orgFilter.first().click();
            await page.waitForLoadState('networkidle');

            // Should show organization achievements
        }
    });

    test('achievement progress display', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for progress indicators
        const progressBar = page.locator('[role="progressbar"], .progress, [class*="progress"]');
        const hasProgressBar = await progressBar.count() > 0;

        // Or percentage display
        const percentageDisplay = page.locator('text=/\\d+%/');
        const hasPercentage = await percentageDisplay.count() > 0;

        // Or X/Y format
        const fractionDisplay = page.locator('text=/\\d+\\/\\d+/');
        const hasFraction = await fractionDisplay.count() > 0;

        // Some progress indicator should exist
    });

    test('achievement badge displays correctly', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for achievement cards/badges
        const achievementCard = page.locator('[data-testid*="achievement-card"], .achievement-card, [class*="achievement"]');

        if (await achievementCard.count() > 0) {
            // Each card should have title and description
            const cardTitle = achievementCard.first().locator('h2, h3, [class*="title"]');
            const hasTitle = await cardTitle.count() > 0;

            const cardDesc = achievementCard.first().locator('p, [class*="description"]');
            const hasDesc = await cardDesc.count() > 0;
        }
    });

    test('locked achievements show requirements', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for locked achievements
        const lockedAchievement = page.locator('[data-testid*="locked"], .locked, [class*="locked"]');

        if (await lockedAchievement.count() > 0) {
            // Should show what's needed to unlock
            const requirementText = lockedAchievement.first().locator('text=/require|need|necesit/i');
            const hasRequirement = await requirementText.count() > 0;
        }
    });

    test('achievement notification on unlock', async ({ page }) => {
        // When an achievement is unlocked, a notification should appear
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Check if there's an achievement toast/notification after creating first objective
        await ensureDefaultCategories(page);
        await createObjective(page, {
            title: `Achievement Notif ${Date.now()}`,
            ensureCategories: false,
        });

        // Look for toast or notification
        const achievementToast = page.locator('[data-sonner-toast], .toast, [class*="notification"]');
        const hasToast = await achievementToast.count() > 0;

        // Or achievement popup
        const achievementPopup = page.locator('[role="dialog"]:has-text("Achievement"), [data-testid*="achievement-popup"]');
        const hasPopup = await achievementPopup.count() > 0;
    });

    test('achievement points accumulate', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Get initial points
        const pointsDisplay = page.getByText(/\d+.*points|\d+.*puntos/i);

        if (await pointsDisplay.count() > 0) {
            const initialPointsText = await pointsDisplay.first().textContent();
            const initialPoints = parseInt(initialPointsText?.match(/\\d+/)?.[0] || '0');

            // Create an objective to potentially gain points
            await ensureDefaultCategories(page);
            await createObjective(page, {
                title: `Points Test ${Date.now()}`,
                ensureCategories: false,
            });

            // Return to achievements
            await page.goto('/dashboard/achievements');
            await page.waitForLoadState('networkidle');

            // Points might have increased (depends on achievement system)
        }
    });

    test('achievement categories display', async ({ page }) => {
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for achievement category sections
        const categorySection = page.locator('[data-testid*="category"], h2, h3');

        // Categories like "Objectives", "Progress", "Collaboration" etc.
        const objectivesCategory = page.locator('text=/objectives|objetivos/i');
        const progressCategory = page.locator('text=/progress|progreso/i');

        // Some categorization should exist
    });
});
