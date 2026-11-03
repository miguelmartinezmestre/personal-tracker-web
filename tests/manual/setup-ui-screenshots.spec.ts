import { test, expect, type Locator, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { verifyEmailFromInvitationPage, waitForInvitationUrl } from '../helpers/email-verification';
import {
    createOrganization,
    createTestUser,
    generateTestUserData,
    hasOrganizationSelectedInUI,
    loginUser,
} from '../helpers/test-helpers';

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

async function useOrganization(page: Page, name: string): Promise<void> {
    const switcher = page.getByTestId('organization-switcher').first();

    if ((await switcher.textContent())?.includes(name)) {
        return;
    }

    await switcher.click();
    await page.locator('[data-testid^="organization-option-"]').filter({ hasText: name }).click();
    await expect(switcher).toContainText(name, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
}

const ADMIN = generateTestUserData({ customUsername: 'Ana Martínez' });

test.describe('Memoria setup + UI screenshots', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240_000);

    test('Capture setup wizard and refresh main UI figures', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const userData = ADMIN;
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
        await page.locator('label[for="policy-open"]').click();
        await expect(page.locator('#policy-open')).toBeChecked();
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

    test('Capture collaboration, account, notification and admin figures', async ({
        browser,
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await loginUser(page, ADMIN.email, ADMIN.password);
        await waitForDashboardReady(page);
        await useOrganization(page, 'Product Team');

        const objectives = [
            { title: 'Run 200 km', unit: 'km', target: '200', progress: ['60', '60'] },
            { title: 'Read 12 books', unit: 'books', target: '12', progress: ['5', '4'] },
            { title: 'Publish 4 blog posts', unit: 'posts', target: '4', progress: ['2', '2'] },
        ];

        for (const objective of objectives) {
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(objective.title);
            await page.getByTestId('objective-unit-input').fill(objective.unit);
            await page.getByTestId('objective-start-input').fill('0');
            await page.getByTestId('objective-target-input').fill(objective.target);
            await page.getByTestId('objective-save-button').click();

            const row = page.getByTestId('objective-row-link').filter({ hasText: objective.title });
            await expect(row).toBeVisible({ timeout: 15_000 });
            await row.click();
            await expect(page.getByTestId('objective-detail-title')).toHaveText(objective.title, {
                timeout: 15_000,
            });

            for (const value of objective.progress) {
                const entries = await page.getByTestId('progress-entry-value').count();
                await page.getByTestId('progress-value-input').fill(value);
                await page.getByTestId('progress-save-button').click();
                await expect(page.getByTestId('progress-entry-value')).toHaveCount(entries + 1, {
                    timeout: 15_000,
                });
            }
        }

        await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
        await page.getByTestId('objective-create-open').click();
        await page.getByTestId('objective-title-input').fill('Learn TypeScript');
        await page
            .getByTestId('objective-description-input')
            .fill('Complete the TypeScript course and build three real-world projects');
        await page.getByTestId('objective-category-select').click();
        await page.getByRole('option', { name: 'Education' }).click();
        await page.getByTestId('objective-unit-input').fill('hours');
        await page.getByTestId('objective-start-input').fill('0');
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-deadline-input').fill('in 40 days');
        await page.getByTestId('objective-deadline-input').blur();
        await page.waitForTimeout(400);

        const dialog = page.getByRole('dialog');

        await dialog.getByText(/^Fill out the form below/).click();

        let viewportHeight = 900;

        for (let attempt = 0; attempt < 6; attempt++) {
            const hiddenHeight = await dialog.evaluate(element => {
                let hidden = Math.max(0, element.scrollHeight - element.clientHeight);

                element.querySelectorAll('*').forEach(child => {
                    hidden = Math.max(hidden, child.scrollHeight - child.clientHeight);
                });

                return hidden;
            });

            if (hiddenHeight <= 1) {
                break;
            }

            viewportHeight += hiddenHeight + 40;
            await page.setViewportSize({ width: 1440, height: viewportHeight });
            await page.waitForTimeout(400);
        }

        await captureFigure(page, 'objetivos-crear-formulario.png');
        await page.getByTestId('objective-save-button').click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await page.setViewportSize({ width: 1440, height: 900 });

        await createOrganization(page, { name: 'Marketing' });
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
        await waitForDashboardReady(page);
        await useOrganization(page, 'Product Team');

        const carlos = generateTestUserData({ customUsername: 'Carlos López' });

        const collaboratorContext = await browser.newContext({
            viewport: { width: 1440, height: 900 },
        });

        try {
            const collaboratorPage = await collaboratorContext.newPage();
            await createTestUser(collaboratorPage, { customUsername: 'Carlos López' });
            await collaboratorPage.goto('about:blank');

            const miguelContext = await browser.newContext();
            await createTestUser(await miguelContext.newPage(), {
                customUsername: 'Miguel García',
            });
            await miguelContext.close();

            await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
            await page
                .getByTestId('table-row')
                .filter({ hasText: 'Product Team' })
                .first()
                .getByTestId('organization-detail-link')
                .click();
            await page.waitForURL(/\/dashboard\/organizations\/[^/?]+/, { timeout: 15_000 });
            await page.getByTestId('organization-member-create-open').click();
            await page.getByTestId('organization-member-email-input').fill(carlos.email);
            await page.getByTestId('organization-member-save-button').click();
            await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
                timeout: 20_000,
            });

            await collaboratorPage.goto('/dashboard/invitations');
            await verifyEmailFromInvitationPage(collaboratorPage, carlos.email);
            await collaboratorPage.getByTestId('invitation-accept-button').first().click();
            await collaboratorPage.getByTestId('invitation-accept-confirm-button').click();
            await expect(collaboratorPage.getByTestId('organization-switcher')).toContainText(
                'Product Team',
                { timeout: 20_000 }
            );

            await collaboratorPage.goto('/dashboard/organizations', {
                waitUntil: 'domcontentloaded',
            });
            await collaboratorPage
                .getByTestId('table-row')
                .filter({ hasText: 'Product Team' })
                .first()
                .getByTestId('organization-detail-link')
                .click();
            await collaboratorPage.waitForURL(/\/dashboard\/organizations\/[^/?]+/, {
                timeout: 15_000,
            });
            await collaboratorPage.waitForLoadState('networkidle');
            await collaboratorPage.getByTestId('organization-leave').click();
            await expect(collaboratorPage.getByTestId('delete-confirm-button')).toBeVisible();
            await collaboratorPage.waitForTimeout(400);
            await captureFigure(collaboratorPage, 'abandonar-organizacion.png');
            await collaboratorPage.keyboard.press('Escape');

            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await waitForDashboardReady(page);
            await page.waitForLoadState('networkidle');
            await page.getByTestId('organization-switcher').first().click();
            await page.waitForTimeout(500);
            await captureFigure(page, 'organizacion-selector.png');
            await page.keyboard.press('Escape');

            await expect(page.getByTestId('notification-bell-count')).toBeVisible({
                timeout: 20_000,
            });
            await page.getByTestId('notification-bell').click();
            await expect(page.getByTestId('notification-row').first()).toBeVisible({
                timeout: 15_000,
            });
            await page.waitForTimeout(500);
            await captureFigure(page, 'notificaciones-campana.png');
            await page.keyboard.press('Escape');

            await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
            const currentPassword = page.getByTestId('settings-currentPassword-input');
            await expect(currentPassword).toBeVisible({ timeout: 15_000 });
            await currentPassword.fill(ADMIN.password);
            await page.getByTestId('settings-newPassword-input').fill('NewPassword123');
            await page.getByTestId('settings-confirmPassword-input').fill('NewPassword123');
            await page.getByTestId('settings-password-save').scrollIntoViewIfNeeded();
            await page.waitForTimeout(400);
            await captureFigure(page, 'cambiar-contrasena.png');

            await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('admin-users')).toBeVisible({ timeout: 15_000 });

            const carlosRow = page.getByTestId('table-row').filter({ hasText: carlos.email });
            await expect(carlosRow).toHaveCount(1, { timeout: 15_000 });
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(600);
            await captureFigure(page, 'admin-panel-usuarios.png');

            await carlosRow.getByTestId('admin-sessions-open').click();
            await expect(page.getByTestId('admin-sessions-list').locator('li').first()).toBeVisible(
                { timeout: 15_000 }
            );
            await page.waitForTimeout(400);
            await captureFigure(page, 'admin-panel-sesiones.png');
        } finally {
            await collaboratorContext.close();
        }
    });

    test('Capture the screens without a figure, in Spanish', async ({ browser, page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        const origin = new URL(page.url()).origin;
        const spanish = [{ name: 'locale', value: 'es', url: origin }];

        async function spanishContext() {
            const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            await context.addCookies(spanish);

            return context;
        }

        await page.context().addCookies(spanish);
        await loginUser(page, ADMIN.email, ADMIN.password);
        await waitForDashboardReady(page);
        await useOrganization(page, 'Product Team');
        await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 15_000 });

        const anonymous = await spanishContext();
        const carlosContext = await spanishContext();
        const miguelContext = await spanishContext();

        try {
            const anonymousPage = await anonymous.newPage();
            await anonymousPage.goto('/register', { waitUntil: 'networkidle' });
            await anonymousPage.getByTestId('register-username-input').fill('Laura Sánchez');
            await anonymousPage
                .getByTestId('register-email-input')
                .fill('laura.sanchez@example.com');
            await anonymousPage.getByTestId('register-password-input').fill('Password123');
            await anonymousPage.getByTestId('register-confirm-password-input').fill('Password123');
            await captureFigure(anonymousPage, 'registro.png');

            await anonymousPage.goto('/forget-password', { waitUntil: 'networkidle' });
            await anonymousPage.getByTestId('email-input').fill('laura.sanchez@example.com');
            await captureFigure(anonymousPage, 'recuperar-contrasena.png');

            for (const title of ['Learn guitar', 'Meditate every day']) {
                await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
                await page.getByTestId('objective-create-open').click();
                await page.getByTestId('objective-title-input').fill(title);
                await page.getByTestId('objective-target-input').fill('30');
                await page.getByTestId('objective-save-button').click();

                const row = page.getByTestId('objective-row-link').filter({ hasText: title });
                await expect(row).toBeVisible({ timeout: 15_000 });
                await row.click();
                await expect(page.getByTestId('objective-detail-title')).toHaveText(title, {
                    timeout: 15_000,
                });
                await page.getByTestId('objective-delete-button').click();
                await page.getByTestId('delete-confirm-button').click();
                await expect(page).toHaveURL(/\/dashboard\/objectives(?:\?|$)/, {
                    timeout: 15_000,
                });
            }

            await page.getByTestId('objectives-trash-link').click();
            await expect(page.getByTestId('table-row')).toHaveCount(2, { timeout: 15_000 });
            await page.waitForLoadState('networkidle');
            await captureFigure(page, 'papelera.png');

            await page.goto('/dashboard/categories', { waitUntil: 'networkidle' });
            await page.waitForTimeout(600);
            await captureFigure(page, 'categorias.png');

            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-row-link').filter({ hasText: 'Run 200 km' }).click();
            await page.getByTestId('objective-access-open').click();
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
            await page.waitForTimeout(600);
            await captureFigure(page, 'permisos-objetivo.png');
            await page.keyboard.press('Escape');

            const miguel = generateTestUserData({ customUsername: 'Miguel García' });
            const laura = 'laura.sanchez@example.com';

            async function invite(organization: string, email: string) {
                await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
                await page
                    .getByTestId('table-row')
                    .filter({ hasText: organization })
                    .first()
                    .getByTestId('organization-detail-link')
                    .click();
                await page.waitForURL(/\/dashboard\/organizations\/[^/?]+/, { timeout: 15_000 });
                await page.getByTestId('organization-member-create-open').click();
                await page.getByTestId('organization-member-email-input').fill(email);
                await page.getByTestId('organization-member-save-button').click();
                await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
                    timeout: 20_000,
                });
            }

            await invite('Product Team', miguel.email);
            await invite('Marketing', miguel.email);

            const invitedAt = Date.now();
            await invite('Product Team', laura);
            const invitationUrl = await waitForInvitationUrl(page, laura, invitedAt);
            await anonymousPage.goto(new URL(invitationUrl).pathname, { waitUntil: 'networkidle' });
            await anonymousPage.waitForTimeout(600);
            await captureFigure(anonymousPage, 'invitacion-publica.png');

            const miguelPage = await miguelContext.newPage();
            await loginUser(miguelPage, miguel.email, miguel.password);
            await miguelPage.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
            await verifyEmailFromInvitationPage(miguelPage, miguel.email);
            await expect(miguelPage.getByTestId('invitation-accept-button')).toHaveCount(2, {
                timeout: 20_000,
            });
            await miguelPage.waitForLoadState('networkidle');
            await miguelPage.waitForTimeout(600);
            await captureFigure(miguelPage, 'invitaciones-centro.png');

            const carlos = generateTestUserData({ customUsername: 'Carlos López' });
            const carlosPage = await carlosContext.newPage();
            await loginUser(carlosPage, carlos.email, carlos.password);
            await carlosPage.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
            await carlosPage
                .getByTestId('table-row')
                .filter({ hasText: 'Product Team' })
                .first()
                .getByTestId('organization-detail-link')
                .click();
            await carlosPage.waitForURL(/\/dashboard\/organizations\/[^/?]+/, {
                timeout: 15_000,
            });
            await carlosPage.waitForLoadState('networkidle');
            await carlosPage.getByTestId('organization-leave').click();
            await expect(carlosPage.getByTestId('delete-confirm-button')).toBeVisible();
            await carlosPage.waitForTimeout(400);
            await captureFigure(carlosPage, 'abandonar-organizacion.png');
            await carlosPage.keyboard.press('Escape');

            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            await waitForDashboardReady(page);
            await page.waitForLoadState('networkidle');
            await page.getByTestId('organization-switcher').first().click();
            await page.waitForTimeout(500);
            await captureFigure(page, 'organizacion-selector.png');
            await page.keyboard.press('Escape');

            await expect(page.getByTestId('notification-bell-count')).toBeVisible({
                timeout: 20_000,
            });
            await page.getByTestId('notification-bell').click();
            await expect(page.getByTestId('notification-row').first()).toBeVisible({
                timeout: 15_000,
            });
            await page.waitForTimeout(500);
            await captureFigure(page, 'notificaciones-campana.png');
            await page.keyboard.press('Escape');

            await page.goto('/dashboard/home', { waitUntil: 'networkidle' });
            await expect(page.getByTestId('command-menu-ready')).toBeAttached({ timeout: 15_000 });
            await page.keyboard.press('Control+k');
            await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
            await page.waitForTimeout(400);
            await captureFigure(page, 'paleta-comandos.png');
            await page.keyboard.press('Escape');

            await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });
            await expect(page.getByTestId('settings-name-input')).toHaveValue(ADMIN.username, {
                timeout: 15_000,
            });
            await page.waitForTimeout(400);
            await captureFigure(page, 'ajustes.png', { fullPage: true });

            await page.getByTestId('settings-currentPassword-input').fill(ADMIN.password);
            await page.getByTestId('settings-newPassword-input').fill('NewPassword123');
            await page.getByTestId('settings-confirmPassword-input').fill('NewPassword123');
            await page.getByTestId('settings-password-save').scrollIntoViewIfNeeded();
            await page.waitForTimeout(400);
            await captureFigure(page, 'cambiar-contrasena.png');
        } finally {
            await Promise.all([anonymous.close(), carlosContext.close(), miguelContext.close()]);
        }
    });
});
