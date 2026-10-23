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
        { tag: ['@REQ-ROLES-001', '@cross-browser-critical', '@mobile-critical'] },
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
            tag: [
                '@REQ-ROLES-001',
                '@REQ-AUTENTICACION-005',
                '@REQ-NF-002',
                '@cross-browser-critical',
                '@mobile-critical',
            ],
        },
        async ({ page }) => {
            await createTestUser(page);
            await expectOnDashboard(page);

            for (const route of protectedRoutes) {
                await page.goto(route, { waitUntil: 'domcontentloaded' });
                await expect(page).toHaveURL(new RegExp(`${route}(\\?|$)`));
            }

            await logoutUser(page);
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expectOnLogin(page);
        }
    );

    test(
        'public auth routes remain available without a session',
        { tag: ['@REQ-ROLES-001', '@cross-browser-critical', '@mobile-critical'] },
        async ({ page, context }) => {
            await context.clearCookies();

            await page.goto('/', { waitUntil: 'domcontentloaded' });
            expect(page.url()).not.toContain('/login');

            await page.goto('/login', { waitUntil: 'domcontentloaded' });
            await expect(page).toHaveURL(/\/login(\?|$)/);

            await page.goto('/register', { waitUntil: 'domcontentloaded' });
            await expect(page).toHaveURL(/\/register$/);
        }
    );
});
