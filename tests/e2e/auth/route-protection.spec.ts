import { test, expect } from '@playwright/test';
import {
    createObjective,
    createTestUser,
    ensureAuthenticatedState,
    logoutUser,
} from '../../helpers/test-helpers';
import {
    expectOnLogin,
    expectOnDashboard,
    expectAdminMenuVisible,
    expectAdminMenuHidden,
} from '../../helpers/assertions';

test.describe('Route Protection', () => {
    const protectedRoutes = [
        '/dashboard/home',
        '/dashboard/objectives',
        '/dashboard/categories',
        '/dashboard/organizations',
        '/dashboard/settings',
        '/dashboard/notifications',
        '/dashboard/sessions',
        '/dashboard/achievements',
    ] as const;

    test(
        'anonymous users are redirected from protected dashboard routes',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
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
        { tag: ['@REQ-ROLES-001', '@REQ-AUTENTICACION-005', '@REQ-NF-002', '@cross-browser'] },
        async ({ page }) => {
            await createTestUser(page);
            await expectOnDashboard(page);

            for (const route of protectedRoutes) {
                await page.goto(route, { waitUntil: 'domcontentloaded' });
                await expect(page).toHaveURL(/\/dashboard\//);
                expect(page.url()).not.toContain('/login');
            }

            await logoutUser(page);
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expectOnLogin(page);
        }
    );

    test(
        'public auth routes remain available without a session',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
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

    test(
        'admin navigation is visible only to admins and admin routes reject members',
        { tag: ['@REQ-ROLES-001', '@REQ-ROLES-002', '@cross-browser'] },
        async ({ page, browser }) => {
            await createTestUser(page);
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await expectAdminMenuHidden(page);

            await page.goto('/dashboard/admin/users', { waitUntil: 'domcontentloaded' });
            await expect
                .poll(
                    async () => {
                        const currentUrl = page.url();
                        const accessDeniedCount = await page
                            .getByRole('heading', {
                                name: /access denied|forbidden|no autorizado|sin acceso/i,
                            })
                            .count();
                        return !currentUrl.includes('/admin/') || accessDeniedCount > 0;
                    },
                    { timeout: 10000, intervals: [200, 500, 1000] }
                )
                .toBeTruthy();

            const adminContext = await browser.newContext({
                storageState: 'tests/.auth/admin-user.json',
            });
            const adminPage = await adminContext.newPage();
            await ensureAuthenticatedState(adminPage);
            await adminPage.goto('/dashboard/admin/users', { waitUntil: 'domcontentloaded' });

            await expect(adminPage).toHaveURL(/\/dashboard\/admin\/users/);
            await expectAdminMenuVisible(adminPage);
            await adminContext.close();
        }
    );

    test(
        'one user cannot see another user personal objectives',
        { tag: ['@REQ-NF-003'] },
        async ({ browser }) => {
            const contextA = await browser.newContext();
            const pageA = await contextA.newPage();
            await createTestUser(pageA);

            const objectiveTitle = `User A Secret Objective ${Date.now()}`;
            await createObjective(pageA, { title: objectiveTitle, ensureCategories: false });

            const contextB = await browser.newContext();
            const pageB = await contextB.newPage();
            await createTestUser(pageB);
            await pageB.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

            await expect(pageB.getByText(objectiveTitle)).toHaveCount(0);

            await contextA.close();
            await contextB.close();
        }
    );
});
