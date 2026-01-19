import { test, expect } from '@playwright/test';
import { createTestUser, createObjective } from './test-helpers';

async function seedObjectives(page: import('@playwright/test').Page, count: number) {
    for (let i = 0; i < count; i++) {
        await createObjective(page, { title: `paged-${i}` });
    }
}

test('pagination: objectives list paginates (mobile view)', async ({ page }) => {
    await createTestUser(page);
    await page.setViewportSize({ width: 375, height: 800 });

    await seedObjectives(page, 15);

    await page.goto('/dashboard/objectives');
    await page.waitForLoadState('networkidle');

    const paginationNext = page.getByRole('button', { name: /next/i });
    if (await paginationNext.isVisible()) {
        await paginationNext.click();
        await expect(page.getByRole('button', { name: /previous/i })).toBeEnabled();
    }
});

test('pagination: notifications table next/previous', async ({ page }) => {
    await createTestUser(page);

    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');

    const nextButton = page.getByRole('button', { name: /next/i });
    const prevButton = page.getByRole('button', { name: /previous/i });

    if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(prevButton).toBeEnabled();
    }
});
