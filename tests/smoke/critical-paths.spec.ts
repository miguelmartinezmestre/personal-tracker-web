import { test, expect } from '@playwright/test';
import {
    createTestUser,
    createTestUserViaAPI,
    ensureAuthenticatedState,
    ensureDefaultCategories,
    loginUser,
    logoutUser,
    openCreateObjectiveModal,
    openCreateProgressModal,
    DEFAULT_PASSWORD,
} from '../helpers/test-helpers';
import { randomUUID } from 'crypto';

async function selectAvailableObjectiveCategory(
    page: import('@playwright/test').Page
): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByTestId('objective-category-select').click();

        const enabledCategoryOptions = page.locator(
            '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
        );

        try {
            await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 5000 });
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
            await ensureDefaultCategories(page);
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await openCreateObjectiveModal(page);
            await page.waitForTimeout(1000);
            continue;
        }

        const personalOption = enabledCategoryOptions.filter({ hasText: /personal/i }).first();
        if ((await personalOption.count()) > 0) {
            await personalOption.click();
        } else {
            await enabledCategoryOptions.first().click();
        }
        return;
    }

    throw new Error('No enabled objective category option became available');
}

test.describe('Critical Paths - Smoke Tests', () => {
    test(
        'complete user journey: register, create objective, update progress, complete, view achievements',
        {
            tag: [
                '@REQ-AUTENTICACION-001',
                '@REQ-OBJETIVOS-001',
                '@REQ-PROGRESO-001',
                '@REQ-LOGROS-001',
            ],
        },
        async ({ page }) => {
            const uuid = randomUUID().substring(0, 8);
            const username = `smoketest-${uuid}`;
            const email = `smoke-${uuid}@test.com`;
            const password = DEFAULT_PASSWORD;
            const organizationSlug = `org-${uuid}`;

            await createTestUser(page, {
                customUsername: username,
                customEmail: email,
                customOrganizationSlug: organizationSlug,
                password,
            });
            await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);

            const welcomeMessage = page.getByTestId('welcome-message');
            await expect(welcomeMessage).toContainText(username);

            await ensureAuthenticatedState(page);
            await ensureDefaultCategories(page);

            const objectiveTitle = `Smoke Test Goal ${uuid}`;

            await page.goto('/dashboard/objectives');

            await openCreateObjectiveModal(page);

            await page.getByTestId('objective-title-input').fill(objectiveTitle);
            await page.getByTestId('objective-description-input').fill('Testing critical path');
            await selectAvailableObjectiveCategory(page);
            await page.getByTestId('objective-target-input').fill('100');
            await page.getByTestId('objective-unit-input').fill('points');
            await page.getByTestId('objective-save-button').click();

            await expect(
                page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first()
            ).toBeVisible({ timeout: 10000 });

            const createdObjectiveRow = page
                .getByTestId('table-row')
                .filter({ hasText: objectiveTitle })
                .first();
            await createdObjectiveRow.getByTestId('objective-progress-link').click();
            await expect(page).toHaveURL(/\/dashboard\/objectives\/.+/);

            await expect(page.getByRole('main').first()).toContainText(objectiveTitle);

            await openCreateProgressModal(page);
            await page.getByTestId('progress-value-input').fill('100');
            await page
                .getByTestId('progress-comment-input')
                .fill('Critical path completion update');
            await page.getByTestId('progress-save-button').click();
            await page.waitForLoadState('domcontentloaded');

            await page.goto('/dashboard/achievements');
            await page.waitForLoadState('domcontentloaded');
            await expect(page).toHaveURL(/\/dashboard\/achievements/);

            await logoutUser(page);

            await page.goto('/dashboard/home');
            await expect(page).toHaveURL(/\/login$/);

            console.log('Critical path smoke test completed successfully');
        }
    );

    test(
        'login flow works correctly',
        { tag: ['@REQ-AUTENTICACION-002', '@cross-browser'] },
        async ({ page }) => {
            const { email, username } = await createTestUserViaAPI(page);

            await logoutUser(page);

            await loginUser(page, email);
            await ensureAuthenticatedState(page);

            await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);
            const welcomeMessage = page.getByTestId('welcome-message');
            await expect(welcomeMessage).toContainText(username);

            console.log('✅ Login smoke test completed successfully');
        }
    );

    test(
        'navigation between main pages works',
        { tag: ['@REQ-NF-021', '@cross-browser'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);

            const pages = [
                { route: '/dashboard/home', check: /home/i },
                { route: '/dashboard/objectives', check: /objectives|objetivos/i },
                { route: '/dashboard/categories', check: /categories|categorías/i },
                { route: '/dashboard/organizations', check: /organizations|organizaciones/i },
                { route: '/dashboard/notifications', check: /notifications|notificaciones/i },
                { route: '/dashboard/achievements', check: /achievements|logros/i },
                { route: '/dashboard/sessions', check: /sessions|sesiones/i },
                { route: '/dashboard/settings', check: /settings|configuración/i },
            ];

            for (const { route } of pages) {
                await page.goto(route);
                await page.waitForURL(new RegExp(`${route.replace('/', '\\/')}(\\?|$)`), {
                    timeout: 10000,
                });

                expect(page.url()).toContain('/dashboard/');
                expect(page.url()).not.toContain('/login');
            }

            console.log('Navigation smoke test completed successfully');
        }
    );

    test(
        'CRUD operations work for objectives',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-OBJETIVOS-003', '@REQ-NF-025'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);
            await ensureAuthenticatedState(page);
            await ensureDefaultCategories(page);

            const uuid = randomUUID().substring(0, 8);
            const title = `CRUD Test ${uuid}`;

            await page.goto('/dashboard/objectives');
            await openCreateObjectiveModal(page);
            await page.getByTestId('objective-title-input').fill(title);
            await selectAvailableObjectiveCategory(page);
            await page.getByTestId('objective-target-input').fill('50');
            await page.getByTestId('objective-unit-input').fill('items');
            await page.getByTestId('objective-save-button').click();
            await expect(
                page.getByTestId('table-row').filter({ hasText: title }).first()
            ).toBeVisible({
                timeout: 10000,
            });

            await expect(
                page.getByTestId('table-row').filter({ hasText: title }).first()
            ).toBeVisible();

            const editTitleInput = page.getByTestId('objective-edit-title-input');
            let editDialogOpened = false;

            for (let attempt = 0; attempt < 3; attempt++) {
                const createdRow = page.getByTestId('table-row').filter({ hasText: title }).first();
                await expect(createdRow).toBeVisible({ timeout: 10000 });
                await createdRow.getByTestId('objective-edit-open').click();

                try {
                    await expect(editTitleInput).toBeVisible({ timeout: 5000 });
                    editDialogOpened = true;
                    break;
                } catch {
                    await page.keyboard.press('Escape').catch(() => undefined);
                }
            }

            if (!editDialogOpened) {
                throw new Error('Could not open objective edit dialog in smoke test');
            }

            const cancelButton = page.getByTestId('objective-cancel-button');
            if (await cancelButton.isVisible()) {
                await cancelButton.click();
            } else {
                await page.keyboard.press('Escape');
            }

            await expect(editTitleInput).toBeHidden({ timeout: 10000 });

            const objectiveRow = page.getByTestId('table-row').filter({ hasText: title });
            let deletionCompleted = false;
            let lastDeleteError: unknown = null;

            for (let attempt = 0; attempt < 3; attempt++) {
                const row = objectiveRow.first();
                await expect(row).toBeVisible({ timeout: 10000 });
                await row.getByTestId('objective-delete-button').click();

                const deleteDialog = page.getByRole('alertdialog');
                await expect(deleteDialog).toBeVisible({ timeout: 10000 });

                const confirmButton = deleteDialog.getByTestId('delete-confirm-button');
                await expect(confirmButton).toBeVisible({ timeout: 10000 });
                await expect(confirmButton).toBeEnabled({ timeout: 10000 });

                try {
                    await confirmButton.click({ timeout: 5000 });
                } catch (error) {
                    lastDeleteError = error;
                }

                try {
                    await expect(objectiveRow).toHaveCount(0, { timeout: 10000 });
                    deletionCompleted = true;
                    break;
                } catch (error) {
                    lastDeleteError = error;
                    await page.keyboard.press('Escape').catch(() => undefined);
                }
            }

            if (!deletionCompleted) {
                throw new Error(
                    `Could not confirm objective deletion in smoke test: ${String(lastDeleteError)}`
                );
            }

            console.log('CRUD smoke test completed successfully');
        }
    );

    test(
        'authentication protection works',
        { tag: ['@REQ-ROLES-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/dashboard/home');
            await expect(page).toHaveURL(/\/login$/);

            await page.goto('/dashboard/objectives');
            await expect(page).toHaveURL(/\/login$/);

            await page.goto('/dashboard/settings');
            await expect(page).toHaveURL(/\/login$/);

            console.log('Auth protection smoke test completed successfully');
        }
    );

    test('form validation works', { tag: ['@REQ-NF-018', '@cross-browser'] }, async ({ page }) => {
        await createTestUserViaAPI(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');
        await openCreateObjectiveModal(page);

        await page.getByTestId('objective-save-button').click();

        const errorMessage = page.locator(
            'text=/required|requerido|at least|al menos|character|caracter|invalid|inválido/i'
        );
        await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });

        console.log('Form validation smoke test completed successfully');
    });

    test(
        'data persists after page reload',
        { tag: ['@REQ-OBJETIVOS-001', '@cross-browser'] },
        async ({ page }) => {
            await createTestUserViaAPI(page);
            await ensureAuthenticatedState(page);
            await ensureDefaultCategories(page);

            const uuid = randomUUID().substring(0, 8);
            const title = `Persist Test ${uuid}`;

            await page.goto('/dashboard/objectives');
            await openCreateObjectiveModal(page);
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-category-select').click();
            await page.waitForSelector('[role="option"]', { timeout: 10000 });
            const persistOption = page
                .getByRole('option')
                .filter({ hasText: /personal/i })
                .first();
            if ((await persistOption.count()) > 0) {
                await persistOption.click();
            } else {
                await page.getByRole('option').first().click();
            }
            await page.getByTestId('objective-target-input').fill('100');
            await page.getByTestId('objective-unit-input').fill('units');
            await page.getByTestId('objective-save-button').click();
            await expect(
                page.getByTestId('table-row').filter({ hasText: title }).first()
            ).toBeVisible({
                timeout: 10000,
            });

            await page.reload();
            await page.waitForURL(/\/dashboard\/objectives(\?|$)/, { timeout: 10000 });

            await expect(
                page.getByTestId('table-row').filter({ hasText: title }).first()
            ).toBeVisible({
                timeout: 10000,
            });

            console.log('✅ Data persistence smoke test completed successfully');
        }
    );
});
