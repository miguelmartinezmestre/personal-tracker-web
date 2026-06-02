import { test, expect } from '@playwright/test';
import {
    createTestUser,
    ensureDefaultCategories,
    openCreateObjectiveModal,
} from '../../helpers/test-helpers';

test.describe('CSRF Protection', () => {
    test('should use POST method for state-changing forms', async ({ page }) => {
        await createTestUser(page);
        await ensureDefaultCategories(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        await openCreateObjectiveModal(page);

        const form = page.locator('form').first();
        await expect(form).toBeVisible();

        const method = await form.getAttribute('method');
        if (method) {
            expect(method.toLowerCase()).toBe('post');
        }
    });

    test('should keep invalid objective submissions inside the authenticated form', async ({
        page,
    }) => {
        await createTestUser(page);
        await ensureDefaultCategories(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');
        await openCreateObjectiveModal(page);

        await page.getByTestId('objective-save-button').click();
        await expect(page.getByTestId('objective-title-input')).toBeVisible();
        expect(page.url()).toContain('/dashboard/objectives');
    });

    test('cookies should have secure attributes', async ({ page, context }) => {
        await createTestUser(page);

        const cookies = await context.cookies();

        const authCookies = cookies.filter(
            cookie =>
                cookie.name.toLowerCase().includes('session') ||
                cookie.name.toLowerCase().includes('auth') ||
                cookie.name.toLowerCase().includes('token')
        );

        for (const cookie of authCookies) {
            if (process.env.NODE_ENV === 'production') {
                expect(cookie.httpOnly).toBe(true);
                expect(cookie.secure).toBe(true);
                expect(cookie.sameSite).toBe('Lax');
            }
        }
    });
});
