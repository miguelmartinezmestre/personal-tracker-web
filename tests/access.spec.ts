import { test, expect } from '@playwright/test';

test('redirects unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard/home');
    await expect(page).toHaveURL(/\/login$/);
});


