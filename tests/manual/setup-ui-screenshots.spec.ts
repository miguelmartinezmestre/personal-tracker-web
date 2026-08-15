/**
 * Captures /setup wizard steps and refreshes key UI screenshots for the thesis
 * (metricas-memoria/figures). Run via the isolated E2E stack:
 *
 *   pnpm exec tsx scripts/run-e2e-stack.ts \
 *     --config=tests/manual/playwright.manual.config.ts \
 *     tests/manual/setup-ui-screenshots.spec.ts
 *
 * Optional: MEMORIA_FIGURES_DIR=../metricas-memoria/figures
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
    generateTestUserData,
    hasOrganizationSelectedInUI,
    openCreateObjectiveModal,
} from '../helpers/test-helpers';

const FIGURES_DIR = process.env.MEMORIA_FIGURES_DIR
    ? path.resolve(process.env.MEMORIA_FIGURES_DIR)
    : path.resolve(process.cwd(), '../metricas-memoria/figures');

const FALLBACK_DIR = path.join(process.cwd(), 'test-results/screenshots/memoria');

async function hideTransientUi(page: Page): Promise<void> {
    await page.evaluate(() => {
        document.querySelectorAll('[data-sonner-toaster]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
        document.querySelectorAll('[data-loading]').forEach(element => {
            (element as HTMLElement).style.display = 'none';
        });
        document
            .querySelectorAll(
                [
                    '[data-nextjs-dialog]',
                    '[data-nextjs-toast]',
                    '[data-next-badge]',
                    '[data-next-badge-root]',
                    'nextjs-portal',
                    '#__next-build-watcher',
                ].join(', ')
            )
            .forEach(element => {
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
    await page.waitForTimeout(250);
}

async function captureFigure(
    page: Page,
    filename: string,
    options?: { fullPage?: boolean }
): Promise<void> {
    await hideTransientUi(page);

    const targets = [FIGURES_DIR, FALLBACK_DIR];
    for (const dir of targets) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    const buffer = await page.screenshot({
        fullPage: options?.fullPage ?? false,
        animations: 'disabled',
    });

    for (const dir of targets) {
        fs.writeFileSync(path.join(dir, filename), buffer);
    }
    console.log(`Wrote figure: ${filename}`);
}

async function waitForDashboardReady(page: Page): Promise<void> {
    await expect(async () => {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);
        await expect(page.getByTestId('organization-switcher')).toBeVisible();
        expect(await hasOrganizationSelectedInUI(page)).toBe(true);
    }).toPass({ timeout: 30_000 });
}

test.describe('Memoria setup + UI screenshots', () => {
    test.setTimeout(240_000);

    test('Capture setup wizard and refresh main UI figures', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const userData = generateTestUserData({ customUsername: 'Ana Martínez' });
        const setupSecret = process.env.SETUP_SECRET;

        console.log(`Figures directory: ${FIGURES_DIR}`);

        await page.goto('/setup', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');
        const platformName = page.getByTestId('setup-platform-name');
        await expect(platformName).toBeVisible({ timeout: 20_000 });
        await platformName.click();
        await platformName.fill('');
        await platformName.pressSequentially('Metrics App', { delay: 15 });
        await platformName.blur();
        await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
        await captureFigure(page, 'setup-platform.png');
        await page.getByTestId('setup-next-button').click();

        await expect(page.getByTestId('setup-username')).toBeVisible({ timeout: 10_000 });
        await page.getByTestId('setup-username').fill(userData.username);
        await page.getByTestId('setup-email').fill(userData.email);
        await page.getByTestId('setup-password').fill(userData.password);
        await page.getByTestId('setup-confirm-password').fill(userData.password);
        if (setupSecret) {
            const secretInput = page.getByTestId('setup-secret');
            await expect(secretInput).toBeVisible({ timeout: 5_000 });
            await secretInput.fill(setupSecret);
        }
        await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
        await captureFigure(page, 'setup-admin.png');
        await page.getByTestId('setup-next-button').click();

        await expect(page.getByTestId('setup-org-name')).toBeVisible({ timeout: 10_000 });
        await page.getByTestId('setup-org-name').click();
        await page.getByTestId('setup-org-name').fill('');
        await page.getByTestId('setup-org-name').pressSequentially('Product Team', { delay: 15 });
        await page.getByTestId('setup-org-name').blur();
        await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
        await captureFigure(page, 'setup-org.png');
        await page.getByTestId('setup-next-button').click();

        await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
        await page.waitForTimeout(400);
        await captureFigure(page, 'setup-categories.png');
        await page.getByTestId('setup-next-button').click();

        await expect(page.locator('#policy-open')).toBeVisible({ timeout: 10_000 });
        await page.locator('#policy-open').click();
        await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
        await captureFigure(page, 'setup-registration-policy.png');
        await page.getByTestId('setup-next-button').click();

        await expect(page.getByTestId('setup-complete-button')).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(400);
        await captureFigure(page, 'setup-summary.png');

        await page.getByTestId('setup-complete-button').click();
        await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 45_000 });
        await waitForDashboardReady(page);

        // Landing / auth / dashboard refreshes
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await captureFigure(page, 'landing-page-hero.png');

        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await captureFigure(page, 'captura_pantalla_login_desktop.png');
        await page.getByTestId('login-button').click();
        await page.waitForTimeout(400);
        await captureFigure(page, 'validacion-error.png');

        await page.getByTestId('email-input').fill(userData.email);
        await page.getByTestId('password-input').fill(userData.password);
        await page.getByTestId('login-button').click();
        await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
        await waitForDashboardReady(page);
        await captureFigure(page, 'captura_pantalla_inicial_desktop.png');

        const sidebar = page.getByTestId('app-sidebar');
        if (await sidebar.isVisible().catch(() => false)) {
            await sidebar.screenshot({
                path: path.join(FIGURES_DIR, 'navegacion-sidebar.png'),
                animations: 'disabled',
            });
            fs.copyFileSync(
                path.join(FIGURES_DIR, 'navegacion-sidebar.png'),
                path.join(FALLBACK_DIR, 'navegacion-sidebar.png')
            );
            console.log('Wrote figure: navegacion-sidebar.png');
        }

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        await captureFigure(page, 'objetivos-lista.png');

        await openCreateObjectiveModal(page);
        await page.waitForTimeout(500);
        await page.getByTestId('objective-title-input').fill('Learn TypeScript');
        await page
            .getByTestId('objective-description-input')
            .fill('Complete the TypeScript fundamentals course');
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('hours');
        await captureFigure(page, 'objetivos-crear-formulario.png');
        await page.getByTestId('objective-save-button').click();
        await page.waitForTimeout(1200);
        await captureFigure(page, 'objetivos-creado.png');
        await captureFigure(page, 'objetivos-lista.png');

        const filterToggle = page
            .getByTestId('objectives-filter-toggle')
            .or(page.getByRole('button', { name: /filter|filtr/i }));
        if (
            await filterToggle
                .first()
                .isVisible({ timeout: 3000 })
                .catch(() => false)
        ) {
            await filterToggle.first().click();
            await page.waitForTimeout(400);
            await captureFigure(page, 'objetivos-filtros.png');
        }

        const firstObjectiveLink = page.locator('a[href*="/dashboard/objectives/"]').first();
        if (await firstObjectiveLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            await firstObjectiveLink.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await captureFigure(page, 'progreso-detalle.png');

            const addProgress = page
                .getByTestId('add-progress-button')
                .or(page.getByRole('button', { name: /progress|progreso/i }));
            if (
                await addProgress
                    .first()
                    .isVisible({ timeout: 3000 })
                    .catch(() => false)
            ) {
                await addProgress.first().click();
                await page.waitForTimeout(500);
                await captureFigure(page, 'progreso-formulario.png');
                await page.keyboard.press('Escape');
            }
        }

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        await captureFigure(page, 'organizaciones-lista.png');

        const orgLink = page.locator('a[href*="/dashboard/organizations/"]').first();
        if (await orgLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            await orgLink.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await captureFigure(page, 'organizaciones-miembros.png');
        }

        await page.goto('/dashboard/notifications');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'notificaciones-lista.png');

        await page.goto('/dashboard/sessions');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'sesiones-lista.png');

        await page.goto('/dashboard/achievements');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        await captureFigure(page, 'logros-overview.png');

        const adminLink = page.locator('a[href*="/dashboard/admin"]').first();
        if (await adminLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            await page.goto('/dashboard/admin');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await captureFigure(page, 'admin-panel-usuarios.png');

            const sessionsTab = page.getByRole('tab', { name: /session/i });
            if (
                await sessionsTab
                    .first()
                    .isVisible({ timeout: 3000 })
                    .catch(() => false)
            ) {
                await sessionsTab.first().click();
                await page.waitForTimeout(500);
                await captureFigure(page, 'admin-panel-sesiones.png');
            }

            const auditTab = page.getByRole('tab', { name: /audit|auditor/i });
            if (
                await auditTab
                    .first()
                    .isVisible({ timeout: 3000 })
                    .catch(() => false)
            ) {
                await auditTab.first().click();
                await page.waitForTimeout(500);
                await captureFigure(page, 'admin-panel-auditoria.png');
            }
        }

        // Mobile views
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await captureFigure(page, 'captura_pantalla_login_mobile.png');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'captura_pantalla_inicial_mobile.png');

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'objetivos-mobile.png');

        console.log(`Setup + UI figures written to ${FIGURES_DIR}`);
    });
});
