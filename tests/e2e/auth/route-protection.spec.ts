import { test, expect } from '@playwright/test';
import { createTestUser, logoutUser } from '../../helpers/test-helpers';
import { expectOnLogin, expectOnDashboard } from '../../helpers/assertions';

test.describe('Route Protection', () => {
    const protectedRoutes = [
        '/dashboard/home',
        '/dashboard/organizations',
        '/dashboard/invitations',
    ] as const;

    test(
        'anonymous users are redirected from protected dashboard routes',
        { tag: ['@REQ-NF-003', '@cross-browser-critical', '@mobile-critical'] },
        async ({ page, context }) => {
            await context.clearCookies();

            for (const route of protectedRoutes) {
                await page.goto(route, { waitUntil: 'domcontentloaded' });
                await expectOnLogin(page);
            }
        }
    );

    test(
        'authenticated users can use dashboard routes and are sent back to login after logout',
        {
            tag: ['@REQ-AUTENTICACION-005', '@cross-browser-critical', '@mobile-critical'],
        },
        async ({ page }) => {
            await createTestUser(page);
            await expectOnDashboard(page);

            for (const route of protectedRoutes) {
                await page.goto(route, { waitUntil: 'domcontentloaded' });
                await expect(page).toHaveURL(new RegExp(`${route}(\\?|$)`));
            }

            await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
            await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);

            await logoutUser(page);
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expectOnLogin(page);
        }
    );
});
