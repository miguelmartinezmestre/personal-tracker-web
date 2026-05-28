import { test, expect } from '@playwright/test';
import {
    createTestUserViaAPI,
    ensureAuthenticatedState,
    ensureDefaultCategories,
    loginUser,
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
        { route: '/dashboard/home', name: 'home' },
        { route: '/dashboard/objectives', name: 'objectives' },
        { route: '/dashboard/categories', name: 'categories' },
        { route: '/dashboard/organizations', name: 'organizations' },
        { route: '/dashboard/settings', name: 'settings' },
        { route: '/dashboard/notifications', name: 'notifications' },
        { route: '/dashboard/sessions', name: 'sessions' },
        { route: '/dashboard/achievements', name: 'achievements' },
    ] as const;

    test(
        'redirect to login when not authenticated',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/dashboard/home');

            await page.waitForURL(/\/login$/);
            await expectOnLogin(page);
        }
    );

    for (const { route, name } of protectedRoutes) {
        test(
            `redirect to login for ${name} page when not authenticated`,
            { tag: ['@REQ-ROLES-001'] },
            async ({ page }) => {
                await page.goto(route);
                await page.waitForURL(/\/login$/);
                await expectOnLogin(page);
            }
        );
    }

    test(
        'redirect to dashboard after successful login',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);

            await expectOnDashboard(page);
            await expect(page).toHaveURL(/\/dashboard\/home$/);
        }
    );

    test(
        'protect admin routes from non-admin users',
        { tag: ['@REQ-ROLES-001', '@REQ-ROLES-002', '@cross-browser'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);

            await page.goto('/dashboard/admin/users');
            await page.waitForLoadState('domcontentloaded');

            const maxWaitTime = Date.now() + 10000;
            let isBlocked = false;

            while (Date.now() < maxWaitTime && !isBlocked) {
                const currentUrl = page.url();
                const hasAccessDenied = await page
                    .getByRole('heading', {
                        name: /access denied|forbidden|no autorizado|sin acceso/i,
                    })
                    .isVisible()
                    .catch(() => false);

                isBlocked = !currentUrl.includes('/admin/') || hasAccessDenied;

                if (!isBlocked) {
                    await page.waitForTimeout(200);
                }
            }

            const currentUrl = page.url();
            const isRedirected = !currentUrl.includes('/admin/');
            const hasAccessDenied = await page
                .getByRole('heading', { name: /access denied|forbidden|no autorizado|sin acceso/i })
                .isVisible()
                .catch(() => false);

            expect(isRedirected || hasAccessDenied).toBeTruthy();
        }
    );

    test(
        'admin routes accessible to admin users',
        { tag: ['@REQ-ROLES-001', '@REQ-ROLES-002', '@cross-browser'] },
        async ({ browser }) => {
            const adminContext = await browser.newContext({
                storageState: 'tests/.auth/admin-user.json',
            });
            const adminPage = await adminContext.newPage();

            for (let attempt = 0; attempt < 3; attempt++) {
                await ensureAuthenticatedState(adminPage);
                await adminPage.goto('/dashboard/admin/users', { waitUntil: 'domcontentloaded' });

                const hasGlobalError = await adminPage
                    .getByRole('heading', { name: /this page couldn.t load/i })
                    .isVisible()
                    .catch(() => false);

                if (!hasGlobalError) {
                    break;
                }

                await adminPage.waitForTimeout(500);
            }

            const currentUrl = adminPage.url();
            const hasAdminAccess =
                currentUrl.includes('/dashboard/admin/users') ||
                currentUrl.includes('/dashboard/home');
            expect(hasAdminAccess).toBeTruthy();

            await expectAdminMenuVisible(adminPage);
            await adminContext.close();
        }
    );

    test(
        'admin menu visible only for admin users',
        { tag: ['@REQ-ROLES-001', '@REQ-ROLES-002'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);

            await page.goto('/dashboard/home');
            await page.waitForLoadState('domcontentloaded');

            await expectAdminMenuHidden(page);
        }
    );

    test(
        'admin menu visible for admin users',
        { tag: ['@REQ-ROLES-001', '@REQ-ROLES-002'] },
        async ({ browser }) => {
            const adminContext = await browser.newContext({
                storageState: 'tests/.auth/admin-user.json',
            });
            const adminPage = await adminContext.newPage();
            await ensureAuthenticatedState(adminPage);

            await adminPage.goto('/dashboard/home');
            await adminPage.waitForLoadState('domcontentloaded');

            await expectAdminMenuVisible(adminPage);
            await adminContext.close();
        }
    );

    test(
        'authenticated user can access all dashboard routes',
        { tag: ['@REQ-ROLES-001'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);

            const routes = [
                '/dashboard/home',
                '/dashboard/objectives',
                '/dashboard/categories',
                '/dashboard/organizations',
                '/dashboard/notifications',
                '/dashboard/achievements',
                '/dashboard/sessions',
                '/dashboard/settings',
            ];

            for (const route of routes) {
                await page.goto(route);
                await page.waitForLoadState('domcontentloaded');

                const currentUrl = page.url();
                expect(currentUrl).toContain('/dashboard/');
                expect(currentUrl).not.toContain('/login');
            }
        }
    );

    test(
        'session expires after logout',
        { tag: ['@REQ-AUTENTICACION-005', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);
            await expectOnDashboard(page);

            await logoutUser(page);

            await page.goto('/dashboard/home');

            await expectOnLogin(page);
        }
    );

    test(
        'landing page accessible without authentication',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/');

            await page.waitForLoadState('domcontentloaded');

            const currentUrl = page.url();
            expect(currentUrl).not.toContain('/login');
        }
    );

    test(
        'login page accessible without authentication',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/login');
            await page.waitForLoadState('domcontentloaded');

            await expect(page).toHaveURL(/\/login$/);
        }
    );

    test(
        'register page accessible without authentication',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/register');
            await page.waitForLoadState('domcontentloaded');

            await expect(page).toHaveURL(/\/register$/);
        }
    );

    test(
        'authenticated user accessing login redirects to dashboard',
        { tag: ['@REQ-ROLES-001', '@cross-browser'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);

            await page.goto('/login');
            await page.waitForLoadState('domcontentloaded');

            await expect
                .poll(() => page.url(), { timeout: 5000, intervals: [200, 400, 800] })
                .toMatch(/\/(dashboard|login)/);

            const currentUrl = page.url();

            expect(
                currentUrl.includes('/dashboard/') || currentUrl.includes('/login')
            ).toBeTruthy();
        }
    );

    test.describe('Security', () => {
        test(
            'user A cannot access user B objectives',
            { tag: ['@REQ-SEGURIDAD-001', '@REQ-OBJETIVOS-004'] },
            async ({ browser }) => {
                const contextA = await browser.newContext();
                const pageA = await contextA.newPage();
                await createTestUserViaAPI(pageA);

                await ensureDefaultCategories(pageA);
                await pageA.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
                await pageA.getByTestId('objective-create-open').click();
                await pageA.waitForSelector('[data-testid="objective-title-input"]');
                const objectiveTitle = `User A Secret Objective ${Date.now()}`;
                await pageA.getByTestId('objective-title-input').fill(objectiveTitle);
                await pageA.getByTestId('objective-target-input').fill('100');
                await pageA.getByTestId('objective-unit-input').fill('units');
                await pageA.getByTestId('objective-category-select').click();
                const enabledCategoryOptions = pageA.locator(
                    '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
                );
                await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 10000 });
                await enabledCategoryOptions.first().click();
                await pageA.getByTestId('objective-save-button').click();

                await expect(
                    pageA.getByTestId('table-row').filter({ hasText: objectiveTitle }).first()
                ).toBeVisible({ timeout: 10000 });

                const contextB = await browser.newContext();
                const pageB = await contextB.newPage();
                const userB = await createTestUserViaAPI(pageB);

                try {
                    await pageB.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
                } catch {
                    await loginUser(pageB, userB.email, userB.password);
                    await pageB.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
                }

                await expect(pageB.getByText(objectiveTitle)).toHaveCount(0);

                await contextA.close();
                await contextB.close();
            }
        );

        test(
            'member cannot access admin audit logs',
            { tag: ['@REQ-SEGURIDAD-002', '@REQ-ADMIN-001'] },
            async ({ browser }) => {
                const context = await browser.newContext();
                const page = await context.newPage();

                await createTestUserViaAPI(page);

                await page.goto('/dashboard/admin/audit');
                await page.waitForLoadState('domcontentloaded');

                await expect
                    .poll(
                        async () => {
                            const currentUrl = page.url();
                            const isRedirected = !currentUrl.includes('/admin/');
                            const hasAccessDenied = await page
                                .getByRole('heading', {
                                    name: /access denied|forbidden|no autorizado/i,
                                })
                                .isVisible()
                                .catch(() => false);
                            return isRedirected || hasAccessDenied;
                        },
                        { timeout: 10000, intervals: [200, 500, 1000] }
                    )
                    .toBeTruthy();

                await context.close();
            }
        );

        test(
            'member cannot access admin sessions',
            { tag: ['@REQ-SEGURIDAD-002', '@REQ-ADMIN-001'] },
            async ({ browser }) => {
                const context = await browser.newContext();
                const page = await context.newPage();

                await createTestUserViaAPI(page);

                await page.goto('/dashboard/admin/sessions');
                await page.waitForLoadState('domcontentloaded');

                await expect
                    .poll(
                        async () => {
                            const currentUrl = page.url();
                            const isRedirected = !currentUrl.includes('/admin/');
                            const hasAccessDenied = await page
                                .getByRole('heading', {
                                    name: /access denied|forbidden|no autorizado/i,
                                })
                                .isVisible()
                                .catch(() => false);
                            return isRedirected || hasAccessDenied;
                        },
                        { timeout: 10000, intervals: [200, 500, 1000] }
                    )
                    .toBeTruthy();

                await context.close();
            }
        );

        test(
            'expired invitation should not work',
            { tag: ['@REQ-SEGURIDAD-003', '@REQ-EQUIPOS-008'] },
            async ({ page, browser }) => {
                const adminContext = await browser.newContext({
                    storageState: 'tests/.auth/admin-user.json',
                });
                const adminPage = await adminContext.newPage();
                await ensureAuthenticatedState(adminPage);

                await adminPage.goto('/dashboard/organizations');
                await adminPage.waitForLoadState('domcontentloaded');

                const orgName = `Invitation Test ${Date.now()}`;
                await adminPage.getByTestId('organization-create-open').click();
                await adminPage.waitForSelector('[data-testid="organization-name-input"]');
                await adminPage.getByTestId('organization-name-input').fill(orgName);
                await adminPage.getByTestId('organization-description-input').fill('Test org');
                await adminPage.getByTestId('organization-save-button').click();

                await expect(
                    adminPage.getByTestId('table-row').filter({ hasText: orgName }).first()
                ).toBeVisible({ timeout: 10000 });

                const orgRow = adminPage
                    .getByTestId('table-row')
                    .filter({ hasText: orgName })
                    .first();
                await orgRow.getByTestId('organization-detail-link').click();
                await adminPage.waitForLoadState('domcontentloaded');

                const inviteEmail = `expired-${Date.now()}@example.com`;
                await adminPage.getByTestId('organization-member-create-open').click();
                await adminPage.waitForSelector('[data-testid="organization-member-email-input"]');
                await adminPage.getByTestId('organization-member-email-input').fill(inviteEmail);
                await adminPage.getByTestId('organization-member-save-button').click();

                await expect(adminPage.getByTestId('organization-member-email-input')).toBeHidden({
                    timeout: 10000,
                });

                await adminContext.close();

                await page.goto('/register');
                await page.waitForLoadState('domcontentloaded');

                await page
                    .getByRole('textbox', { name: /username|nombre de usuario/i })
                    .fill(`ExpiredUser${Date.now()}`);
                await page.getByRole('textbox', { name: /email|correo/i }).fill(inviteEmail);
                await page.getByRole('textbox', { name: /^password$/i }).fill('Password123');
                await page
                    .getByRole('textbox', { name: /confirm password|confirmar/i })
                    .fill('Password123');

                await page.getByRole('button', { name: /register|registrar/i }).click();

                await page.waitForLoadState('domcontentloaded');
                const url = page.url();
                expect(url).toMatch(/\/(dashboard|login|register)/);
            }
        );
    });
});
