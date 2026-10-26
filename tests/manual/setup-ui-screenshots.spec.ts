import { test, expect, type Locator, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { generateTestUserData, hasOrganizationSelectedInUI } from '../helpers/test-helpers';

let FIGURES_DIR: string;

if (process.env.MEMORIA_FIGURES_DIR) {
    FIGURES_DIR = path.resolve(process.env.MEMORIA_FIGURES_DIR);
} else {
    FIGURES_DIR = path.resolve(process.cwd(), '../metricas-memoria/figures');
}

const FALLBACK_DIR = path.join(process.cwd(), 'test-results/screenshots/memoria');

async function isVisibleNow(locator: Locator): Promise<boolean> {
    return locator.isVisible().catch(() => false);
}

async function hideTransientUi(page: Page): Promise<void> {
    await page.evaluate(() => {
        const hide = (element: Element) => {
            if (element instanceof HTMLElement) {
                element.style.display = 'none';
            }
        };

        document.querySelectorAll('[data-sonner-toaster]').forEach(hide);
        document.querySelectorAll('[data-loading]').forEach(hide);
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
            .forEach(hide);
        document
            .querySelectorAll('[class*="error-overlay"], [class*="ErrorOverlay"]')
            .forEach(hide);
        document
            .querySelectorAll('button[class*="bg-destructive"], button[class*="bg-red"]')
            .forEach(element => {
                if (!(element instanceof HTMLElement)) {
                    return;
                }

                const text = element.textContent || '';

                if (/^\d+\s*Issues?$/i.test(text.trim()) || /^\d+$/.test(text.trim())) {
                    element.style.display = 'none';
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

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        await captureFigure(page, 'organizaciones-lista.png');

        const orgLink = page.locator('a[href*="/dashboard/organizations/"]').first();

        if (await isVisibleNow(orgLink)) {
            await orgLink.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(800);
            await captureFigure(page, 'organizaciones-miembros.png');
        }

        await page.goto('/dashboard/invitations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'invitaciones-lista.png');

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await captureFigure(page, 'captura_pantalla_login_mobile.png');

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'captura_pantalla_inicial_mobile.png');

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await captureFigure(page, 'organizaciones-mobile.png');

        console.log(`Setup + UI figures written to ${FIGURES_DIR}`);
    });
});
