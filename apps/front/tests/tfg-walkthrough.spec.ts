/**
 * TFG Walkthrough Test - COMPREHENSIVE FEATURE DOCUMENTATION
 *
 * This test captures screenshots of ALL major features for the TFG thesis documentation.
 * Based on the complete feature inventory in features.md (21 sections).
 *
 * Screenshots are saved to: apps/front/test-results/screenshots/tfg/
 *
 * Run with: pnpm test -- tfg-walkthrough.spec.ts
 *
 * FEATURES COVERED:
 * 1. Landing Page & Public Pages
 * 2. Authentication (Login, Register, Forgot Password, Reset Password)
 * 3. Dashboard Home (Stats, Analytics, Achievements Widget)
 * 4. Objectives Management (CRUD, Status, Periods, Types)
 * 5. Progress Updates (Add, Edit, History)
 * 6. Categories (Create, Edit, Color/Icon selection)
 * 7. Notifications (List, Mark Read, Filters)
 * 8. Achievements (Individual, Organization, Progress, Filters)
 * 9. Organizations Management (Create, Members, Roles)
 * 10. Organization Members (Add, Role management)
 * 11. Sessions (Active sessions, Device info)
 * 12. Settings (Account, Password)
 * 13. Admin Panel (Users, Sessions, Audit Logs)
 * 14. Theme Switching (Light/Dark)
 * 15. Language Switching (i18n - ES/EN)
 * 16. Responsive Views (Mobile, Tablet, Desktop)
 * 17. Table Features (Search, Filter, Export CSV/Excel)
 * 18. Sidebar Navigation
 * 19. OpenAPI Documentation
 */

import { test, expect, Page } from '@playwright/test';
import {
    createTestUser,
    createObjective,
    DEFAULT_PASSWORD,
    loginUser,
    promoteToAdmin,
    createTFGTestUser,
} from './test-helpers';
import * as fs from 'fs';
import * as path from 'path';

// Screenshot counter for ordered filenames
let screenshotCounter = 0;

// Directory for TFG screenshots
const SCREENSHOT_DIR = 'test-results/screenshots/tfg';

/**
 * Takes a screenshot with consistent formatting for TFG documentation.
 * - Hides toasts and other transient UI elements
 * - Uses a consistent viewport
 * - Saves with numbered prefix for ordering
 */
async function takeTFGScreenshot(page: Page, name: string, description?: string) {
    // Ensure directory exists
    const dir = path.join(process.cwd(), SCREENSHOT_DIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Hide toasts, dev elements, and other transient UI elements
    await page.evaluate(() => {
        // Hide Sonner toasts
        document.querySelectorAll('[data-sonner-toaster]').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
        // Hide any loading spinners
        document.querySelectorAll('[data-loading]').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
        // Hide development issue badges (like "2 Issues" badge)
        document.querySelectorAll('[class*="Issues"], [class*="issues"]').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
        // Hide Next.js dev indicator
        document.querySelectorAll('[data-nextjs-dialog], [data-nextjs-toast]').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
        // Hide any error overlays
        document
            .querySelectorAll('[class*="error-overlay"], [class*="ErrorOverlay"]')
            .forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });
        // Hide debug badges (red badges with numbers)
        document
            .querySelectorAll('button[class*="bg-destructive"], button[class*="bg-red"]')
            .forEach(el => {
                const text = el.textContent || '';
                if (/^\d+\s*Issues?$/i.test(text.trim()) || /^\d+$/.test(text.trim())) {
                    (el as HTMLElement).style.display = 'none';
                }
            });
    });

    // Wait for any animations to settle
    await page.waitForTimeout(300);

    // Format filename with counter for ordering
    screenshotCounter++;
    const paddedCounter = String(screenshotCounter).padStart(2, '0');
    const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const filename = `${paddedCounter}-${sanitizedName}.png`;

    await page.screenshot({
        path: path.join(dir, filename),
        fullPage: false, // Capture only viewport for consistency
        animations: 'disabled',
    });

    console.log(`📸 Screenshot ${paddedCounter}: ${name}${description ? ` - ${description}` : ''}`);
}

/**
 * Helper to safely click an element if it exists
 */
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

test.describe('TFG Feature Walkthrough - Complete Documentation', () => {
    test.setTimeout(120000); // 2 minutes for the full walkthrough

    test('Complete application walkthrough with screenshots', async ({ page }) => {
        // Set consistent viewport for all screenshots
        await page.setViewportSize({ width: 1440, height: 900 });

        // ============================================================
        // SECTION 1: LANDING PAGE & PUBLIC PAGES
        // ============================================================
        console.log('\n🏠 SECTION 1: Landing Page & Public Pages\n');

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(
            page,
            'landing-page-hero',
            'Landing page with hero section and CTA buttons'
        );

        // Scroll to features section
        await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.8));
        await page.waitForTimeout(500);
        await takeTFGScreenshot(
            page,
            'landing-page-features',
            'Features section with 6 feature cards'
        );

        // Scroll to CTA section
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        await takeTFGScreenshot(page, 'landing-page-cta', 'Call-to-action section');

        // ============================================================
        // SECTION 2: AUTHENTICATION FLOW (Complete)
        // ============================================================
        console.log('\n🔐 SECTION 2: Authentication Flow\n');

        // Login page
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-login-page', 'Login form with email/password');

        // Show login validation
        await page.getByTestId('login-button').click();
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'auth-login-validation', 'Login form validation errors');

        // Register page
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-register-page', 'Registration form');

        // Forgot password page
        await page.goto('/forget-password');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-forgot-password', 'Forgot password form');

        // Reset password page (with simulated token)
        await page.goto('/reset-password?token=demo-token');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'auth-reset-password', 'Reset password form');

        // Create a test user with presentable name for TFG documentation
        const user = await createTFGTestUser(page, 'Miguel Garcia');
        console.log(`✅ Created test user: ${user.username} (${user.email})`);
        await takeTFGScreenshot(
            page,
            'auth-successful-login',
            'Successful login - redirected to dashboard'
        );

        // ============================================================
        // SECTION 3: DASHBOARD HOME (Analytics & Stats)
        // ============================================================
        console.log('\n📊 SECTION 3: Dashboard Home\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Wait for data to load
        await takeTFGScreenshot(
            page,
            'dashboard-home-initial',
            'Dashboard home with welcome message'
        );

        // ============================================================
        // SECTION 4: CATEGORIES (for objectives)
        // ============================================================
        console.log('\n🏷️ SECTION 4: Categories Management\n');

        // Categories are usually managed through objectives or a dedicated page
        // Let's check if there's a categories section in the objectives form
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');

        await page.getByTestId('objective-create-open').click();
        await page.waitForTimeout(500);

        // Click on category select to show categories
        const categorySelect = page.getByTestId('objective-category-select');
        if (await categorySelect.isVisible()) {
            await categorySelect.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'categories-dropdown',
                'Categories dropdown in objective form'
            );

            // Press Escape to close
            await page.keyboard.press('Escape');
        }

        // Close the modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // ============================================================
        // SECTION 5: OBJECTIVES MANAGEMENT (Complete)
        // ============================================================
        console.log('\n🎯 SECTION 5: Objectives Management\n');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await takeTFGScreenshot(page, 'objectives-empty-state', 'Objectives list - empty state');

        // Open create objective modal
        await page.getByTestId('objective-create-open').click();
        await page.waitForTimeout(500);
        await takeTFGScreenshot(
            page,
            'objectives-create-modal-empty',
            'Create objective modal - empty form'
        );

        // Fill in a VALUE-BASED objective
        await page.getByTestId('objective-title-input').fill('Learn TypeScript');
        await page
            .getByTestId('objective-description-input')
            .fill('Complete the TypeScript fundamentals course and build 3 real-world projects');
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('hours');
        await page.getByTestId('objective-current-input').fill('25');
        await takeTFGScreenshot(
            page,
            'objectives-form-value-based',
            'Objective form - Value-based objective'
        );

        // Save the objective
        await page.getByTestId('objective-save-button').click();
        await page.waitForTimeout(1000);
        await takeTFGScreenshot(
            page,
            'objectives-list-one-item',
            'Objectives list with first objective'
        );

        // Create an EVENT-BASED objective with WEEKLY period
        await page.getByTestId('objective-create-open').click();
        await page.waitForTimeout(300);
        await page.getByTestId('objective-title-input').fill('Weekly Exercise');
        await page
            .getByTestId('objective-description-input')
            .fill('Exercise at least 5 times per week');
        await page.getByTestId('objective-target-input').fill('5');
        await page.getByTestId('objective-unit-input').fill('sessions');
        await page.getByTestId('objective-current-input').fill('2');

        // Try to select objective type if available and enabled
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

        // Try to select period if available and enabled
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

        // Create more objectives for variety
        const objectivesToCreate = [
            { title: 'Read 12 Books this Year', target: '12', unit: 'books', current: '3' },
            { title: 'Run 500km Marathon Training', target: '500', unit: 'km', current: '127' },
            { title: 'Save €5000 Emergency Fund', target: '5000', unit: '€', current: '1250' },
        ];

        for (const obj of objectivesToCreate) {
            await page.getByTestId('objective-create-open').click();
            await page.waitForTimeout(300);
            await page.getByTestId('objective-title-input').fill(obj.title);
            await page.getByTestId('objective-target-input').fill(obj.target);
            await page.getByTestId('objective-unit-input').fill(obj.unit);
            await page.getByTestId('objective-current-input').fill(obj.current);
            await page.getByTestId('objective-save-button').click();
            await page.waitForTimeout(500);
        }

        await takeTFGScreenshot(
            page,
            'objectives-list-multiple',
            'Objectives list with multiple objectives'
        );

        // ============================================================
        // SECTION 6: OBJECTIVE DETAIL & PROGRESS UPDATES
        // ============================================================
        console.log('\n📈 SECTION 6: Objective Detail & Progress Updates\n');

        // Navigate to objectives list first
        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Click on the objective row to see details
        const objectiveLink = page
            .locator('tr:has-text("Learn TypeScript") a, a:has-text("Learn TypeScript")')
            .first();
        if (await objectiveLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await objectiveLink.click();
        } else {
            // Fallback: try clicking the row text
            await page.getByText('Learn TypeScript').first().click();
        }

        // Wait for navigation to objective detail page
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

        // Try to add a progress update
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

            // Fill progress form
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

                // Submit
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

        // Try to see quick actions (Complete, Pause, Archive)
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

        // ============================================================
        // SECTION 7: OBJECTIVES FILTERING & TABLE FEATURES
        // ============================================================
        console.log('\n🔍 SECTION 7: Objectives Filtering & Table Features\n');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Look for search/filter input
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

        // Look for column filters
        const filterButton = page
            .locator('button:has-text("Filter")')
            .or(
                page
                    .locator('button:has-text("Filtrar")')
                    .or(page.locator('[data-testid*="filter"]'))
            );
        if (await filterButton.first().isVisible()) {
            await filterButton.first().click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'objectives-filter-panel', 'Filter panel open');
            await page.keyboard.press('Escape');
        }

        // Look for export buttons (CSV/Excel)
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

        // Look for column visibility toggle
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

        // ============================================================
        // SECTION 8: NOTIFICATIONS
        // ============================================================
        console.log('\n🔔 SECTION 8: Notifications\n');

        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await takeTFGScreenshot(page, 'notifications-list', 'Notifications list');

        // Look for mark all read button
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

        // ============================================================
        // SECTION 9: ACHIEVEMENTS (Individual & Organization)
        // ============================================================
        console.log('\n🏆 SECTION 9: Achievements\n');

        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Check if achievements need seeding - Initialize BEFORE taking screenshots
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
            // Wait for achievements to be created in the database
            await page.waitForTimeout(3000);
            // Reload to see the initialized achievements
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

        // Show stats cards detail
        const statsSection = page.getByTestId('achievements-stats');
        if (await statsSection.isVisible()) {
            await takeTFGScreenshot(
                page,
                'achievements-stats-detail',
                'Achievement stats (Points, Earned, Completion %)'
            );
        }

        // Filter buttons
        const achievementFilterAll = page.getByTestId('achievements-filter-all');
        const achievementFilterEarned = page.getByTestId('achievements-filter-earned');
        const achievementFilterLocked = page.getByTestId('achievements-filter-locked');

        if (await achievementFilterEarned.isVisible()) {
            await achievementFilterEarned.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'achievements-filter-earned',
                'Achievements filtered by earned'
            );
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

        // Tab switching - Individual achievements
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

        // Tab switching - Organization achievements
        const organizationAchievementsTab = page.getByTestId('achievements-tab-organization');
        if (await organizationAchievementsTab.isVisible()) {
            await organizationAchievementsTab.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'achievements-organization-tab', 'Organization achievements');
        }

        // ============================================================
        // SECTION 10: ORGANIZATIONS MANAGEMENT
        // ============================================================
        console.log('\n👥 SECTION 10: Organizations Management\n');

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await takeTFGScreenshot(page, 'organizations-empty-state', 'Organizations list - empty state');

        // Create an organization
        const createOrganizationButton = page.getByTestId('organization-create-open');
        if (await createOrganizationButton.isVisible()) {
            await createOrganizationButton.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'organizations-create-modal', 'Create organization modal');

            // Fill organization form
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

            await takeTFGScreenshot(page, 'organizations-form-filled', 'Organization creation form filled');

            // Save organization
            const saveOrganizationBtn = page.getByTestId('organization-save-button');
            if (await saveOrganizationBtn.isVisible()) {
                await saveOrganizationBtn.click();
                await page.waitForTimeout(1000);
                await takeTFGScreenshot(
                    page,
                    'organizations-list-with-organization',
                    'Organizations list with created organization'
                );

                // Navigate to organization detail
                const organizationLink = page.getByText('Development Organization');
                if (await organizationLink.isVisible()) {
                    await organizationLink.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(500);
                    await takeTFGScreenshot(page, 'organization-detail-view', 'Organization detail view');

                    // ============================================================
                    // SECTION 11: ORGANIZATION MEMBERS
                    // ============================================================
                    console.log('\n👤 SECTION 11: Organization Members\n');

                    // Look for add member button
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

                    // Show current members list
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

        // ============================================================
        // SECTION 12: SESSIONS
        // ============================================================
        console.log('\n📱 SECTION 12: Sessions\n');

        await page.goto('/dashboard/sessions');
        await page.waitForLoadState('networkidle');

        // Wait for sessions to load - they might take a moment to sync
        await page.waitForTimeout(2000);

        // Check if we have "No results" - if so, reload and wait
        const noResults = page.locator('text=No results');
        if (await noResults.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('⚠️ Sessions table is empty, reloading...');
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
        }

        // Wait for session data to appear
        const sessionRow = page.locator('table tbody tr').first();
        try {
            await sessionRow.waitFor({ state: 'visible', timeout: 5000 });
            console.log('✅ Session data is visible');
        } catch {
            console.log('⚠️ No session rows found after waiting');
        }

        await takeTFGScreenshot(page, 'sessions-list', 'Active sessions list with device info');

        // Try to show session details (user agent, IP, etc.)
        const sessionCard = page
            .locator('[data-testid*="session-card"]')
            .or(page.locator('.session-item').first())
            .or(page.locator('table tbody tr').first());
        if (await sessionCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            await takeTFGScreenshot(
                page,
                'session-detail',
                'Session detail (device, browser, location)'
            );
        }

        // ============================================================
        // SECTION 13: SETTINGS
        // ============================================================
        console.log('\n⚙️ SECTION 13: Settings\n');

        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await takeTFGScreenshot(page, 'settings-account-tab', 'Settings - Account tab');

        // Switch to password tab
        const passwordTabBtn = page.getByRole('tab', { name: /password|contraseña/i });
        if (await passwordTabBtn.isVisible()) {
            await passwordTabBtn.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'settings-password-tab', 'Settings - Password tab');
        }

        // ============================================================
        // SECTION 14: ADMIN PANEL (promote user to admin first)
        // ============================================================
        console.log('\n🔧 SECTION 14: Admin Panel\n');

        // Promote the test user to admin so we can access the admin panel
        // Note: This requires ALLOW_PROMOTE_DEV=true in the backend env
        let adminPromoted = false;
        try {
            console.log('Promoting user to admin...');
            await promoteToAdmin(page);
            console.log('User promoted to admin');
            adminPromoted = true;
        } catch (error) {
            console.log('⚠️ Could not promote user to admin (ALLOW_PROMOTE_DEV may not be set)');
            console.log('⚠️ Skipping admin panel screenshots');
        }

        if (adminPromoted) {
            await page.goto('/dashboard/admin-panel');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(500);

            // Now we should have access to the admin panel
            await takeTFGScreenshot(page, 'admin-panel-users', 'Admin panel - Users tab');

            // Sessions tab
            await page.goto('/dashboard/admin-panel?tab=sessions');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'admin-panel-sessions', 'Admin panel - Sessions tab');

            // Audit tab
            await page.goto('/dashboard/admin-panel?tab=audit');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            await takeTFGScreenshot(page, 'admin-panel-audit', 'Admin panel - Audit logs');
        }

        // ============================================================
        // SECTION 15: THEME SWITCHING (Light/Dark Mode)
        // ============================================================
        console.log('\n🌓 SECTION 15: Theme Switching\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Find theme switcher
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

            // Switch to dark mode
            const darkModeOption = page
                .getByRole('menuitem', { name: /dark|oscuro/i })
                .or(page.locator('[data-value="dark"]'));
            if (await darkModeOption.isVisible()) {
                await darkModeOption.click();
                await page.waitForTimeout(500);
                await takeTFGScreenshot(page, 'theme-dark-dashboard', 'Dashboard in dark mode');

                // Take dark mode screenshots of key pages
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

                // Switch back to light mode
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

        // ============================================================
        // SECTION 16: LANGUAGE SWITCHING (i18n)
        // ============================================================
        console.log('\n🌍 SECTION 16: Language Switching\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Find language switcher by test ID
        const langSwitcher = page.getByTestId('language-switcher');

        if (await langSwitcher.isVisible({ timeout: 2000 }).catch(() => false)) {
            await langSwitcher.click();
            await page.waitForTimeout(300);
            await takeTFGScreenshot(
                page,
                'language-switcher-dropdown',
                'Language switcher (English/Español)'
            );

            // Switch to Spanish
            const spanishOption = page.getByTestId('language-option-es');
            if (await spanishOption.isVisible({ timeout: 1000 }).catch(() => false)) {
                await spanishOption.click();
                await page.waitForTimeout(500);
                await takeTFGScreenshot(page, 'language-spanish-ui', 'UI in Spanish');

                // Switch back to English
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

        // ============================================================
        // SECTION 17: RESPONSIVE VIEWS
        // ============================================================
        console.log('\n📱 SECTION 17: Responsive Views\n');

        // Mobile view (iPhone 12/13)
        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-mobile-home', 'Dashboard home on mobile');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-mobile-objectives', 'Objectives on mobile');

        // Look for mobile menu/hamburger
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

        // Tablet view (iPad)
        await page.setViewportSize({ width: 820, height: 1180 });

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-tablet-objectives', 'Objectives on tablet');

        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await takeTFGScreenshot(page, 'responsive-tablet-achievements', 'Achievements on tablet');

        // Reset to desktop
        await page.setViewportSize({ width: 1440, height: 900 });

        // ============================================================
        // SECTION 18: SIDEBAR NAVIGATION
        // ============================================================
        console.log('\n📋 SECTION 18: Sidebar Navigation\n');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Capture sidebar - it should be visible on desktop viewport
        const sidebar = page.getByTestId('app-sidebar');
        if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
            await takeTFGScreenshot(
                page,
                'sidebar-navigation',
                'Sidebar navigation with all menu items'
            );
        } else {
            // Fallback: try to find any aside element
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

        // ============================================================
        // SECTION 19: OPENAPI DOCUMENTATION
        // ============================================================
        console.log('\n📚 SECTION 19: OpenAPI Documentation\n');

        await page.goto('/api/ui');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Check if Swagger UI is visible
        if (page.url().includes('/api/ui')) {
            await takeTFGScreenshot(page, 'openapi-swagger-ui', 'OpenAPI Swagger UI documentation');
        }

        // ============================================================
        // FINAL SUMMARY
        // ============================================================
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
        console.log(' 19. OpenAPI Documentation');
        console.log('='.repeat(60));
    });
});
