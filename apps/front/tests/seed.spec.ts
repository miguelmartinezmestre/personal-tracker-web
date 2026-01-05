import { test, expect } from '@playwright/test';
import { createTestUser } from './test-helpers';

test('achievements seeding initializes definitions for new user', async ({ page }) => {
    await createTestUser(page);
    await page.goto('/dashboard/achievements');

    const seedButton = page.getByTestId('achievements-seed-button');
    await expect(seedButton).toBeVisible();
    await seedButton.click();

    await expect(seedButton).toHaveText(/seeding/i);
    await expect(seedButton).not.toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId('achievements-grid-individual')).toBeVisible({
        timeout: 15000,
    });
});
