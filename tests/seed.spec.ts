import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('achievements seeding initializes definitions for new user', async ({ page }) => {
    await createTestUser(page);
    await page.goto('/dashboard/achievements');
    await page.waitForLoadState('networkidle');

    // Check if seed button is visible (only shown when no achievements exist)
    const seedButton = page.getByTestId('achievements-seed-button');
    const isSeedButtonVisible = (await seedButton.count()) > 0;

    if (isSeedButtonVisible) {
        // Click seed button if achievements don't exist yet
        await seedButton.click();
        await expect(seedButton).toHaveText(/seeding/i);
        await expect(seedButton).not.toBeVisible({ timeout: 15000 });
    }

    // Verify achievements are displayed (either seeded or already present)
    await expect(page.getByTestId('achievements-grid-individual')).toBeVisible({
        timeout: 15000,
    });
});
