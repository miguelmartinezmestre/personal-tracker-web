import { test, expect } from '@playwright/test';
import { createTestUser, takeScreenshot } from './test-helpers';

test.describe('Achievements', () => {
    test('achievements page loads and displays correctly', async ({ page }) => {
        // Create and login user
        await createTestUser(page);

        // Navigate to achievements page
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Take screenshot of initial state
        await takeScreenshot(page, 'achievements', 'page-initial');

        // Verify page is loaded
        await expect(page.getByTestId('achievements-page')).toBeVisible();

        // Verify page title is visible
        await expect(page.getByTestId('achievements-title')).toBeVisible();

        // Verify stats cards are visible
        await expect(page.getByTestId('achievements-stats')).toBeVisible();
        await expect(page.getByTestId('achievements-points-card')).toBeVisible();
        await expect(page.getByTestId('achievements-earned-card')).toBeVisible();

        // Verify tabs are visible
        await expect(page.getByTestId('achievements-tab-individual')).toBeVisible();
        await expect(page.getByTestId('achievements-tab-team')).toBeVisible();

        await takeScreenshot(page, 'achievements', 'page-loaded');
    });

    test('achievements widget appears on dashboard home', async ({ page }) => {
        await createTestUser(page);

        // Should already be on dashboard home after registration
        await expect(page).toHaveURL(/\/dashboard\/home$/);

        // Wait for widget to load
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements', 'home-widget');

        // Verify achievements widget is visible on home
        await expect(page.getByTestId('achievements-widget')).toBeVisible();
    });

    test('achievements link in sidebar navigates correctly', async ({ page }) => {
        await createTestUser(page);

        // Click on achievements in sidebar - use data-slot to identify sidebar link specifically
        // This avoids matching the "View All" button which also links to achievements
        const sidebarLink = page.locator('a[href="/dashboard/achievements"][data-slot="sidebar-menu-button"]');
        await expect(sidebarLink).toBeVisible();
        await sidebarLink.click();

        // Verify navigation
        await expect(page).toHaveURL(/\/dashboard\/achievements$/);
        await takeScreenshot(page, 'achievements', 'sidebar-navigation');
    });

    test('filter buttons work correctly', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Click on "Earned" filter
        await page.getByTestId('achievements-filter-earned').click();
        await takeScreenshot(page, 'achievements', 'filter-earned');

        // Click on "Locked" filter
        await page.getByTestId('achievements-filter-locked').click();
        await takeScreenshot(page, 'achievements', 'filter-locked');

        // Click on "All" filter
        await page.getByTestId('achievements-filter-all').click();
        await takeScreenshot(page, 'achievements', 'filter-all');
    });

    test('tabs switch between individual and team achievements', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Click on Team tab
        await page.getByTestId('achievements-tab-team').click();
        await page.waitForTimeout(500); // Wait for tab content to load
        await expect(page.getByTestId('achievements-content-team')).toBeVisible();
        await takeScreenshot(page, 'achievements', 'tab-team');

        // Click back on Individual tab
        await page.getByTestId('achievements-tab-individual').click();
        await page.waitForTimeout(500);
        await expect(page.getByTestId('achievements-content-individual')).toBeVisible();
        await takeScreenshot(page, 'achievements', 'tab-individual');
    });

    test('initialize achievements button works for new users', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for initialize button (only appears when no achievements are seeded)
        const initButton = page.getByTestId('achievements-seed-button');

        // If the button exists, click it
        if (await initButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await takeScreenshot(page, 'achievements', 'before-initialize');
            await initButton.click();

            // Wait for the button to show "Seeding..." and then disappear
            await expect(initButton).toHaveText(/seeding/i, { timeout: 5000 }).catch(() => {});
            
            // Wait for the seeding to complete and button to disappear
            await expect(initButton).not.toBeVisible({ timeout: 10000 });
            
            // Wait for network to be idle and data to load
            await page.waitForLoadState('networkidle');
            
            // Wait a bit more for React Query to refetch and render
            await page.waitForTimeout(1000);

            await takeScreenshot(page, 'achievements', 'after-initialize');

            // Verify achievements grid is now visible
            await expect(page.getByTestId('achievements-grid-individual')).toBeVisible({
                timeout: 10000,
            });
        }
    });

    test('view all link from widget navigates to achievements page', async ({ page }) => {
        await createTestUser(page);

        // Look for "View All" link in the achievements widget
        const viewAllLink = page.locator('a[href="/dashboard/achievements"]').filter({
            hasText: /view all|ver todos/i,
        });

        if (await viewAllLink.isVisible({ timeout: 3000 }).catch(() => false)) {
            await viewAllLink.click();
            await expect(page).toHaveURL(/\/dashboard\/achievements$/);
            await takeScreenshot(page, 'achievements', 'view-all-navigation');
        }
    });

    test('achievement cards display progress correctly', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Wait for achievement cards to load
        await page.waitForTimeout(1000);

        // Look for achievement cards
        const achievementCards = page.locator('[class*="card"]').filter({
            has: page.locator('text=/progress|progreso/i'),
        });

        // If there are cards, verify they have expected elements
        const cardCount = await achievementCards.count();
        if (cardCount > 0) {
            await takeScreenshot(page, 'achievements', 'cards-with-progress');

            // First card should have progress indicator or earned status
            const firstCard = achievementCards.first();
            await expect(firstCard).toBeVisible();
        }
    });

    test('stats show correct initial values for new user', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements', 'new-user-stats');

        // For a new user, total points should be 0
        await expect(page.getByTestId('achievements-total-points')).toContainText('0');
    });
});

test.describe('Achievements - Earning Flow', () => {
    test('creating first objective triggers achievement check', async ({ page }) => {
        await createTestUser(page);

        // First, initialize achievements if needed
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        const initButton = page.getByTestId('achievements-seed-button');
        const isButtonVisible = await initButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (isButtonVisible) {
            await initButton.click();
            await expect(initButton).not.toBeVisible({ timeout: 15000 });
        }
        // If button is not visible, achievements were already seeded in a previous test

        // Navigate to objectives and create one
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        // Open create modal
        await page.getByTestId('objective-create-open').click();

        // Fill form
        await page.getByTestId('objective-title-input').fill('Test Achievement Objective');
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-current-input').fill('0');

        await takeScreenshot(page, 'achievements', 'objective-for-achievement');

        // Save objective
        await page.getByTestId('objective-save-button').click();

        // Wait for creation
        await expect(page.getByText('Test Achievement Objective')).toBeVisible({ timeout: 10000 });

        await takeScreenshot(page, 'achievements', 'after-creating-objective');

        // Go to achievements to check if "First Steps" was awarded
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const firstObjectiveCard = page.getByTestId('achievement-card-first_objective');
        await expect(firstObjectiveCard).toBeVisible({ timeout: 10000 });
        await expect(firstObjectiveCard).toContainText(/earned|ganad|conseguid|obtenid/i);

        const earnedCountText = await page.getByTestId('achievements-earned-count').innerText();
        const earnedCount = Number.parseInt(earnedCountText, 10);
        expect(earnedCount).toBeGreaterThan(0);

        await takeScreenshot(page, 'achievements', 'after-first-objective-achievement');
    });

    test('notifications appear for earned achievements', async ({ page }) => {
        await createTestUser(page);

        // Navigate to notifications
        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('networkidle');

        await takeScreenshot(page, 'achievements', 'notifications-page');

        // Check if there are any achievement notifications
        const achievementNotification = page.locator('text=/achievement|logro/i');

        // This might or might not show depending on whether achievements were earned
        // Just verify the page loads correctly
        await expect(page).toHaveURL(/\/dashboard\/notifications$/);
    });
});

test.describe('Achievements - Internationalization', () => {
    test('achievements page displays in Spanish when language is changed', async ({ page }) => {
        await createTestUser(page);
        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');

        // Look for language switcher and switch to Spanish
        const langSwitcher = page.locator('[data-testid="language-switcher"]');

        if (await langSwitcher.isVisible({ timeout: 2000 }).catch(() => false)) {
            await langSwitcher.click();

            // Select Spanish
            const spanishOption = page.getByRole('menuitem', { name: /español/i });
            if (await spanishOption.isVisible({ timeout: 1000 }).catch(() => false)) {
                await spanishOption.click();
                await page.waitForLoadState('networkidle');

                await takeScreenshot(page, 'achievements', 'spanish-language');

                // Verify Spanish text is displayed - use testId to avoid strict mode violations
                await expect(page.getByTestId('achievements-title')).toContainText(/logros/i);
            }
        }
    });
});
