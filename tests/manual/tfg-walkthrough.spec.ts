/* eslint-disable max-lines */
import { test, expect, Page } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { createTestUser, loginUser } from '../helpers/test-helpers';
import { createAdminSession } from '../setup/create-admin-session';
import * as fs from 'fs';
import * as path from 'path';

let screenshotCounter = 0;

const SCREENSHOT_DIR = 'test-results/screenshots/tfg';

async function takeTFGScreenshot(page: Page, name: string, description?: string) {
    const screenshotDirectory = path.join(process.cwd(), SCREENSHOT_DIR);
    if (!fs.existsSync(screenshotDirectory)) {
        fs.mkdirSync(screenshotDirectory, { recursive: true });
    }

    await page.evaluate(() => {
        document.querySelectorAll('[data-sonner-toaster]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
        document.querySelectorAll('[data-loading]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
        document.querySelectorAll('[class*="Issues"], [class*="issues"]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
        document.querySelectorAll('[data-nextjs-dialog], [data-nextjs-toast]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
        document
            .querySelectorAll('[class*="error-overlay"], [class*="ErrorOverlay"]')
            .forEach(element => {
                (element as HTMLElement).style.display = 'none';
            });
        document
            .querySelectorAll('button[class*="bg-destructive"], button[class*="bg-red"]')
            .forEach(element => {
                const text = element.textContent || '';
                if (/^\d+\s*Issues?$/i.test(text.trim()) || /^\d+$/.test(text.trim())) {
                    (element as HTMLElement).style.display = 'none';
                }
            });
    });

    await page.waitForTimeout(300);

    screenshotCounter++;
    const paddedCounter = `${screenshotCounter}`.padStart(2, '0');
    const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const filename = `${paddedCounter}-${sanitizedName}.png`;

    await page.screenshot({
        path: path.join(screenshotDirectory, filename),
        fullPage: false,
        animations: 'disabled',
    });

    console.log(`📸 Screenshot ${paddedCounter}: ${name}${description ? ` - ${description}` : ''}`);
}

async function safeClick(page: Page, selector: string, timeout = 2000): Promise<boolean> {
    try {
        const element = page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout });
        await element.click();
        return true;
    } catch {
        return false;
    }
}

async function safeFill(
    page: Page,
    selector: string,
    value: string,
    timeout = 2000
): Promise<boolean> {
    try {
        const element = page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout });
        await element.fill(value);
        return true;
    } catch {
        return false;
    }
}

async function clearBrowserSession(page: Page) {
    await page
        .evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        })
        .catch(() => undefined);
    await page.context().clearCookies();
}

async function seedAchievementsAsAdmin(page: Page) {
    await page.goto('/dashboard/achievements');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const seedButton = page.getByTestId('achievements-seed-button');
    if (await seedButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Initializing achievement definitions with admin user...');
        await seedButton.click();
        await expect(seedButton).toBeHidden({ timeout: 15000 });
    }
}

async function createNotificationViaApi(
    page: Page,
    objectiveTitle: string,
    message: string
): Promise<void> {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_SELF_HOSTED_URL;
    if (!convexUrl) {
        throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured for Playwright tests');
    }

    const tokenResponse = await page.request.get('/api/auth/convex/token');
    if (!tokenResponse.ok()) {
        throw new Error(`Convex token request failed: ${tokenResponse.status()}`);
    }

    const tokenPayload = (await tokenResponse.json()) as { token?: string };
    if (!tokenPayload.token) {
        throw new Error('Convex token response did not include a token');
    }

    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(tokenPayload.token);

    const objectives = await client.query(api.objectives.getObjectivesByUser, {
        paginationOpts: { numItems: 20, cursor: null },
    });
    const objective =
        objectives.page.find(objectiveItem => objectiveItem.title === objectiveTitle) ??
        objectives.page[0];

    if (!objective) {
        throw new Error('No objective available to create a notification');
    }

    await client.mutation(api.notifications.createNotification, {
        objective: objective._id,
        notificationType: 'reminder',
        notificationDate: Date.now(),
        message,
    });
}

test.describe('TFG Feature Walkthrough - Complete Documentation', () => {
    test.setTimeout(180000);

    test('Complete application walkthrough with screenshots', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });

        const adminUser = await createAdminSession(page);
        await seedAchievementsAsAdmin(page);
        await clearBrowserSession(page);

        console.log('\n🏠 SECTION 1: Landing Page & Public Pages\n');

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(
            page,
            'landing-page-hero',
            'Landing page with hero section and CTA buttons'
        );

        await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.8));
        await page.waitForTimeout(500);
        await takeTFGScreenshot(
            page,
            'landing-page-features',
            'Features section with 6 feature cards'
        );

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        await takeTFGScreenshot(page, 'landing-page-cta', 'Call-to-action section');

        await clearBrowserSession(page);

        console.log('\n🔐 SECTION 2: Authentication Flow\n');

        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-login-page', 'Login form with email/password');

        await page.getByTestId('login-button').click();
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'auth-login-validation', 'Login form validation errors');

        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-register-page', 'Registration form');

        await page.goto('/forget-password');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-forgot-password', 'Forgot password form');

        await page.goto('/reset-password?token=demo-token');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-reset-password', 'Reset password form');

        const user = await createTestUser(page, { usePresentableName: true });
        console.log(`✅ Created test user: ${user.username} (${user.email})`);
        await takeTFGScreenshot(
            page,
            'auth-successful-login',
            'Successful login - redirected to dashboard'
        );

        console.log('\n📊 SECTION 3: Dashboard Home\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await takeTFGScreenshot(
            page,
            'dashboard-home-initial',
            'Dashboard home with welcome message'
        );

        console.log('\n🏷️ SECTION 4: Categories Management\n');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        await page.getByTestId('objective-create-open').click();
        await page.waitForTimeout(500);

        const categorySelect = page.getByTestId('objective-category-select');
        if (await categorySelect.isVisible()) {
            await categorySelect.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'categories-dropdown',
                'Categories dropdown in objective form'
            );

            await page.keyboard.press('Escape');
        }

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        console.log('\n🎯 SECTION 5: Objectives Management\n');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'objectives-empty-state', 'Objectives list - empty state');

        await page.getByTestId('objective-create-open').click();
        await page.waitForTimeout(500);
        await takeTFGScreenshot(
            page,
            'objectives-create-modal-empty',
            'Create objective modal - empty form'
        );

        await page.getByTestId('objective-title-input').fill('Learn TypeScript');
        await page
            .getByTestId('objective-description-input')
            .fill('Complete the TypeScript fundamentals course and build 3 real-world projects');
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('hours');
        await safeFill(page, '[data-testid="objective-current-input"]', '25');
        await takeTFGScreenshot(
            page,
            'objectives-form-value-based',
            'Objective form - Value-based objective'
        );

        await page.getByTestId('objective-save-button').click();
        await page.waitForTimeout(1000);
        await takeTFGScreenshot(
            page,
            'objectives-list-one-item',
            'Objectives list with first objective'
        );

        await page.getByTestId('objective-create-open').click();
        await page.waitForTimeout(300);
        await page.getByTestId('objective-title-input').fill('Weekly Exercise');
        await page
            .getByTestId('objective-description-input')
            .fill('Exercise at least 5 times per week');
        await page.getByTestId('objective-target-input').fill('5');
        await page.getByTestId('objective-unit-input').fill('sessions');
        await safeFill(page, '[data-testid="objective-current-input"]', '2');

        const objTypeSelect = page
            .locator('[data-testid*="objective-type"]:not([disabled])')
            .or(page.locator('[data-testid*="objectiveType"]:not([disabled])'));
        if (
            await objTypeSelect
                .first()
                .isVisible({ timeout: 1000 })
                .catch(() => false)
        ) {
            await objTypeSelect.first().click({ timeout: 2000 });
            await page.waitForTimeout(200);
            await takeTFGScreenshot(
                page,
                'objectives-form-type-select',
                'Objective type selection'
            );
            await page.keyboard.press('Escape');
        }

        const periodSelect = page.locator('[data-testid*="period"]:not([disabled])');
        if (
            await periodSelect
                .first()
                .isVisible({ timeout: 1000 })
                .catch(() => false)
        ) {
            await periodSelect.first().click({ timeout: 2000 });
            await page.waitForTimeout(200);
            await takeTFGScreenshot(
                page,
                'objectives-form-period-select',
                'Objective period selection (weekly/monthly/custom)'
            );
            await page.keyboard.press('Escape');
        }

        await page.getByTestId('objective-save-button').click();
        await page.waitForTimeout(500);

        const objectivesToCreate = [
            { title: 'Read 12 Books this Year', target: '12', unit: 'books', current: '3' },
            { title: 'Run 500km Marathon Training', target: '500', unit: 'km', current: '127' },
            { title: 'Save €5000 Emergency Fund', target: '5000', unit: '€', current: '1250' },
        ];

        for (const objective of objectivesToCreate) {
            await page.getByTestId('objective-create-open').click();
            await page.waitForTimeout(300);
            await page.getByTestId('objective-title-input').fill(objective.title);
            await page.getByTestId('objective-target-input').fill(objective.target);
            await page.getByTestId('objective-unit-input').fill(objective.unit);
            await safeFill(page, '[data-testid="objective-current-input"]', objective.current);
            await page.getByTestId('objective-save-button').click();
            await page.waitForTimeout(500);
        }

        await takeTFGScreenshot(
            page,
            'objectives-list-multiple',
            'Objectives list with multiple objectives'
        );

        console.log('\n📈 SECTION 6: Objective Detail & Progress Updates\n');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const objectiveLink = page
            .locator('tr:has-text("Learn TypeScript") a, a:has-text("Learn TypeScript")')
            .first();
        if (await objectiveLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await objectiveLink.click();
        } else {
            await page.getByText('Learn TypeScript').first().click();
        }

        try {
            await page.waitForURL(/\/dashboard\/objectives\/[a-z0-9]+/, { timeout: 5000 });
        } catch {
            console.log('⚠️ Did not navigate to objective detail page, current URL:', page.url());
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await takeTFGScreenshot(
            page,
            'objective-detail-view',
            'Objective detail view with progress'
        );

        const addProgressBtn = page
            .getByTestId('progress-add-button')
            .or(
                page
                    .locator('button:has-text("Add Progress")')
                    .or(page.locator('button:has-text("Añadir progreso")'))
            );
        if (await addProgressBtn.first().isVisible()) {
            await addProgressBtn.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'progress-update-modal', 'Add progress update modal');

            const progressValueInput = page
                .locator('[data-testid*="progress-value"]')
                .or(page.locator('input[type="number"]').first());
            if (await progressValueInput.isVisible()) {
                await progressValueInput.fill('10');

                const progressCommentInput = page
                    .locator('[data-testid*="progress-comment"]')
                    .or(page.locator('textarea').first());
                if (await progressCommentInput.isVisible()) {
                    await progressCommentInput.fill('Completed module 3 of the course');
                }

                await takeTFGScreenshot(
                    page,
                    'progress-update-filled',
                    'Progress update form filled'
                );

                const submitBtn = page
                    .locator('button[type="submit"]')
                    .or(
                        page
                            .locator('button:has-text("Save")')
                            .or(page.locator('button:has-text("Guardar")'))
                    );
                if (await submitBtn.first().isVisible()) {
                    await submitBtn.first().click();
                    await page.waitForTimeout(500);
                    await takeTFGScreenshot(
                        page,
                        'progress-update-added',
                        'Objective with new progress update'
                    );
                }
            }
        }

        const quickActionsContainer = page
            .locator('[data-testid="quick-actions"]')
            .or(page.locator('.quick-actions'));
        if (await quickActionsContainer.isVisible()) {
            await takeTFGScreenshot(
                page,
                'objective-quick-actions',
                'Objective quick actions (Complete, Pause, Archive)'
            );
        }

        console.log('\n🔍 SECTION 7: Objectives Filtering & Table Features\n');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const searchInput = page
            .locator('[data-testid*="search"]')
            .or(
                page
                    .locator('input[placeholder*="Search"]')
                    .or(page.locator('input[placeholder*="Buscar"]'))
            );
        if (await searchInput.first().isVisible()) {
            await searchInput.first().fill('Book');
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'objectives-search-filter',
                'Objectives filtered by search'
            );
            await searchInput.first().clear();
        }

        const filterButton = page
            .getByTestId('objectives-active-filters-button')
            .or(page.locator('button:has(svg.lucide-filter)'));
        if (await filterButton.first().isVisible()) {
            await filterButton.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'objectives-filter-panel', 'Filter panel open');
            await page.keyboard.press('Escape');
        }

        const exportButton = page
            .locator('button:has-text("Export")')
            .or(
                page
                    .locator('button:has-text("Exportar")')
                    .or(page.locator('[data-testid*="export"]'))
            );
        if (await exportButton.first().isVisible()) {
            await exportButton.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'objectives-export-options',
                'Export options (CSV/Excel)'
            );
            await page.keyboard.press('Escape');
        }

        const columnsButton = page
            .locator('button:has-text("Columns")')
            .or(
                page
                    .locator('button:has-text("Columnas")')
                    .or(page.locator('[data-testid*="columns"]'))
            );
        if (await columnsButton.first().isVisible()) {
            await columnsButton.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'objectives-column-visibility',
                'Column visibility toggle'
            );
            await page.keyboard.press('Escape');
        }

        const notificationMessage = 'Reminder: update Learn TypeScript progress before Friday';
        await createNotificationViaApi(page, 'Learn TypeScript', notificationMessage);

        console.log('\n🔔 SECTION 8: Notifications\n');

        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await expect(page.getByText(notificationMessage)).toBeVisible({ timeout: 10000 });
        await takeTFGScreenshot(page, 'notifications-list', 'Notifications list');

        const markAllReadBtn = page
            .locator('button:has-text("Mark all")')
            .or(
                page
                    .locator('button:has-text("Marcar todas")')
                    .or(page.locator('[data-testid*="mark-all-read"]'))
            );
        if (await markAllReadBtn.first().isVisible()) {
            await takeTFGScreenshot(
                page,
                'notifications-mark-all-button',
                'Mark all as read button'
            );
        }

        console.log('\n🏆 SECTION 9: Achievements\n');

        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const seedButton = page.getByTestId('achievements-seed-button');
        const initButton = page.locator('button:has-text("Initialize")').or(seedButton);
        if (
            await initButton
                .first()
                .isVisible({ timeout: 2000 })
                .catch(() => false)
        ) {
            console.log('📝 Initializing achievements...');
            await initButton.first().click();
            await page.waitForTimeout(3000);
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            console.log('✅ Achievements initialized');
        }

        await takeTFGScreenshot(
            page,
            'achievements-overview',
            'Achievements overview with stats cards'
        );

        const statsSection = page.getByTestId('achievements-stats');
        if (await statsSection.isVisible()) {
            await takeTFGScreenshot(
                page,
                'achievements-stats-detail',
                'Achievement stats (Points, Earned, Completion %)'
            );
        }

        const achievementFilterAll = page.getByTestId('achievements-filter-all');
        const achievementFilterEarned = page.getByTestId('achievements-filter-earned');
        const achievementFilterLocked = page.getByTestId('achievements-filter-locked');

        if (await achievementFilterEarned.isVisible()) {
            await achievementFilterEarned.click();
            await page.waitForTimeout(300);
            if (await page.locator('[data-testid^="achievement-card-"]').first().isVisible()) {
                await takeTFGScreenshot(
                    page,
                    'achievements-filter-earned',
                    'Achievements filtered by earned'
                );
            }
        }

        if (await achievementFilterLocked.isVisible()) {
            await achievementFilterLocked.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'achievements-filter-locked',
                'Achievements filtered by locked'
            );
        }

        if (await achievementFilterAll.isVisible()) {
            await achievementFilterAll.click();
            await page.waitForTimeout(300);
        }

        const individualTab = page.getByTestId('achievements-tab-individual');
        if (await individualTab.isVisible()) {
            await individualTab.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'achievements-individual-tab',
                'Individual achievements (milestone, completion, streak, activity)'
            );
        }

        const organizationAchievementsTab = page.getByTestId('achievements-tab-organization');
        if (await organizationAchievementsTab.isVisible()) {
            await organizationAchievementsTab.click();
            await page.waitForTimeout(300);
            if (await page.locator('[data-testid^="achievement-card-"]').first().isVisible()) {
                await takeTFGScreenshot(
                    page,
                    'achievements-organization-tab',
                    'Organization achievements'
                );
            }
        }

        console.log('\n👥 SECTION 10: Organizations Management\n');

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await takeTFGScreenshot(
            page,
            'organizations-personal-state',
            'Organizations list with the default personal organization'
        );

        const createOrganizationButton = page.getByTestId('organization-create-open');
        if (await createOrganizationButton.isVisible()) {
            await createOrganizationButton.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'organizations-create-modal',
                'Create organization modal'
            );

            const organizationNameInput = page.getByTestId('organization-name-input');
            const organizationDescInput = page
                .getByTestId('organization-description-input')
                .or(page.getByTestId('organization-slug-input'));

            if (await organizationNameInput.isVisible()) {
                await organizationNameInput.fill('Development Organization');
            }
            if (await organizationDescInput.isVisible()) {
                await organizationDescInput.fill('Main development organization for the project');
            }

            await takeTFGScreenshot(
                page,
                'organizations-form-filled',
                'Organization creation form filled'
            );

            const saveOrganizationBtn = page.getByTestId('organization-save-button');
            if (await saveOrganizationBtn.isVisible()) {
                await saveOrganizationBtn.click();
                await page.waitForTimeout(1000);
                await takeTFGScreenshot(
                    page,
                    'organizations-list-with-organization',
                    'Organizations list with created organization'
                );

                const organizationLink = page
                    .getByTestId('organizations-table')
                    .getByTestId('table-row')
                    .filter({ hasText: 'Development Organization' })
                    .getByTestId('organization-detail-link')
                    .first();
                if (await organizationLink.isVisible()) {
                    await organizationLink.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(500);
                    await takeTFGScreenshot(
                        page,
                        'organization-detail-view',
                        'Organization detail view'
                    );

                    console.log('\n👤 SECTION 11: Organization Members\n');

                    const addMemberBtn = page
                        .locator('button:has-text("Add Member")')
                        .or(
                            page
                                .locator('button:has-text("Añadir miembro")')
                                .or(page.locator('[data-testid*="member-add"]'))
                        );
                    if (await addMemberBtn.first().isVisible()) {
                        await addMemberBtn.first().click();
                        await page.waitForTimeout(300);
                        await takeTFGScreenshot(
                            page,
                            'organization-add-member-modal',
                            'Add organization member modal'
                        );
                        await page.keyboard.press('Escape');
                    }

                    await takeTFGScreenshot(
                        page,
                        'organization-members-list',
                        'Organization members list with roles'
                    );
                }
            }
        } else {
            await page.keyboard.press('Escape');
        }

        console.log('\n📱 SECTION 12: Sessions\n');

        await page.goto('/dashboard/sessions');
        await page.waitForLoadState('networkidle');

        await page.waitForTimeout(2000);

        const noResults = page.locator('text=No results');
        if (await noResults.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('⚠️ Sessions table is empty, reloading...');
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
        }

        const sessionRow = page.locator('table tbody tr').first();
        try {
            await sessionRow.waitFor({ state: 'visible', timeout: 5000 });
            console.log('✅ Session data is visible');
        } catch {
            console.log('⚠️ No session rows found after waiting');
        }

        await takeTFGScreenshot(page, 'sessions-list', 'Active sessions list with device info');

        const sessionCard = page
            .locator('[data-testid*="session-card"]')
            .or(page.locator('.session-item').first())
            .or(page.locator('table tbody tr').first());
        if (await sessionCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            await takeTFGScreenshot(
                page,
                'sessions-current-row',
                'Current session row with device, browser and location'
            );
        }

        console.log('\n⚙️ SECTION 13: Settings\n');

        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await takeTFGScreenshot(page, 'settings-account-tab', 'Settings - Account tab');

        const passwordTabBtn = page.getByRole('tab', { name: /password|contraseña/i });
        if (await passwordTabBtn.isVisible()) {
            await passwordTabBtn.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'settings-password-tab', 'Settings - Password tab');
        }

        console.log('\n🔧 SECTION 14: Admin Panel\n');
        let adminPromoted = false;
        try {
            console.log('Signing in as the preconfigured admin user...');
            await clearBrowserSession(page);
            await loginUser(page, adminUser.email, adminUser.password);
            console.log('Admin user session is active');
            adminPromoted = true;
        } catch (error) {
            console.log('⚠️ Could not sign in as the preconfigured admin user');
            console.log('⚠️ Skipping admin panel screenshots');
        }

        if (adminPromoted) {
            await page.goto('/dashboard/admin/users');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(500);

            await takeTFGScreenshot(page, 'admin-panel-users', 'Admin panel - Users tab');

            await page.goto('/dashboard/admin/sessions');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'admin-panel-sessions', 'Admin panel - Sessions tab');

            await page.goto('/dashboard/admin/audit');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'admin-panel-audit', 'Admin panel - Audit logs');
        }

        console.log('\n🌓 SECTION 15: Theme Switching\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        const themeSwitcher = page
            .locator('[data-testid="theme-switcher"]')
            .or(
                page
                    .locator('button[aria-label*="theme" i]')
                    .or(
                        page
                            .locator('button:has([class*="sun"])')
                            .or(page.locator('button:has([class*="moon"])'))
                    )
            );

        if (await themeSwitcher.first().isVisible()) {
            await themeSwitcher.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'theme-switcher-dropdown',
                'Theme switcher dropdown (Light/Dark/System)'
            );

            const darkModeOption = page
                .getByRole('menuitem', { name: /dark|oscuro/i })
                .or(page.locator('[data-value="dark"]'));
            if (await darkModeOption.isVisible()) {
                await darkModeOption.click();
                await page.waitForTimeout(500);
                await takeTFGScreenshot(page, 'theme-dark-dashboard', 'Dashboard in dark mode');

                await page.goto('/dashboard/objectives');
                await page.waitForLoadState('networkidle');
                await takeTFGScreenshot(page, 'theme-dark-objectives', 'Objectives in dark mode');

                await page.goto('/dashboard/achievements');
                await page.waitForLoadState('networkidle');
                await takeTFGScreenshot(
                    page,
                    'theme-dark-achievements',
                    'Achievements in dark mode'
                );

                const themeSwitcherAgain = page
                    .locator('[data-testid="theme-switcher"]')
                    .or(page.locator('button[aria-label*="theme" i]'));
                if (await themeSwitcherAgain.first().isVisible()) {
                    await themeSwitcherAgain.first().click();
                    await page.waitForTimeout(200);
                    const lightModeOption = page
                        .getByRole('menuitem', { name: /light|claro/i })
                        .or(page.locator('[data-value="light"]'));
                    if (await lightModeOption.isVisible()) {
                        await lightModeOption.click();
                        await page.waitForTimeout(300);
                    }
                }
            }
        }

        console.log('\n🌍 SECTION 16: Language Switching\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const langSwitcher = page.getByTestId('language-switcher');

        if (await langSwitcher.isVisible({ timeout: 2000 }).catch(() => false)) {
            await langSwitcher.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'language-switcher-dropdown',
                'Language switcher (English/Español)'
            );

            const spanishOption = page.getByTestId('language-option-es');
            if (await spanishOption.isVisible({ timeout: 1000 }).catch(() => false)) {
                await spanishOption.click();
                await page.waitForTimeout(500);
                await takeTFGScreenshot(page, 'language-spanish-ui', 'UI in Spanish');

                await langSwitcher.click();
                await page.waitForTimeout(200);
                const englishOption = page.getByTestId('language-option-en');
                if (await englishOption.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await englishOption.click();
                    await page.waitForTimeout(300);
                }
            }
        } else {
            console.log('⚠️ Language switcher not found');
        }

        console.log('\n📱 SECTION 17: Responsive Views\n');

        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-mobile-home', 'Dashboard home on mobile');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-mobile-objectives', 'Objectives on mobile');

        const mobileMenu = page
            .locator('button[aria-label*="menu" i]')
            .or(
                page
                    .locator('[data-testid*="mobile-menu"]')
                    .or(page.locator('button:has([class*="menu"])'))
            );
        if (await mobileMenu.first().isVisible()) {
            await mobileMenu.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'responsive-mobile-menu', 'Mobile navigation menu');
            await page.keyboard.press('Escape');
        }

        await page.setViewportSize({ width: 820, height: 1180 });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-tablet-objectives', 'Objectives on tablet');

        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-tablet-achievements', 'Achievements on tablet');

        await page.setViewportSize({ width: 1440, height: 900 });

        console.log('\n📋 SECTION 18: Sidebar Navigation\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const sidebar = page.getByTestId('app-sidebar');
        if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
            await takeTFGScreenshot(
                page,
                'sidebar-navigation',
                'Sidebar navigation with all menu items'
            );
        } else {
            const asideSidebar = page.locator('aside').first();
            if (await asideSidebar.isVisible({ timeout: 1000 }).catch(() => false)) {
                await takeTFGScreenshot(
                    page,
                    'sidebar-navigation',
                    'Sidebar navigation with all menu items'
                );
            } else {
                console.log('⚠️ Sidebar not found, taking full page screenshot');
                await takeTFGScreenshot(page, 'sidebar-dashboard-view', 'Dashboard with sidebar');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ TFG WALKTHROUGH COMPLETE!');
        console.log('='.repeat(60));
        console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
        console.log(`📊 Total screenshots: ${screenshotCounter}`);
        console.log('\nFeatures covered:');
        console.log('  1. Landing Page (Hero, Features, CTA)');
        console.log('  2. Authentication (Login, Register, Forgot/Reset Password)');
        console.log('  3. Dashboard Home');
        console.log('  4. Categories');
        console.log('  5. Objectives (CRUD, Types, Periods)');
        console.log('  6. Progress Updates');
        console.log('  7. Table Features (Search, Filter, Export)');
        console.log('  8. Notifications');
        console.log('  9. Achievements (Individual, Organization, Filters)');
        console.log(' 10. Organizations');
        console.log(' 11. Organization Members');
        console.log(' 12. Sessions');
        console.log(' 13. Settings');
        console.log(' 14. Admin Panel');
        console.log(' 15. Theme Switching (Light/Dark)');
        console.log(' 16. Language Switching (EN/ES)');
        console.log(' 17. Responsive Views (Mobile/Tablet)');
        console.log(' 18. Sidebar Navigation');
        console.log('='.repeat(60));
    });
});
