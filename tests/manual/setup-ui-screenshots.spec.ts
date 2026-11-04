import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { verifyEmailFromInvitationPage, waitForInvitationUrl } from '../helpers/email-verification';
import { createOrganization, createTestUser, loginUser } from '../helpers/test-helpers';
import {
    completeSetup,
    createObjective,
    ENGLISH,
    ensureSpanish,
    GYM,
    logProgress,
    openObjective,
    ORGANIZATION,
    OWNER,
    READING,
    RUNNING,
    seedHistory,
    seedObjective,
    spanishContext,
    TRIP,
    useOrganization,
    VIEWPORT,
    WEIGHT,
} from './demo-data';

// Captures every application figure of the thesis, in Spanish, from Lucía's realistic history
// instead of throwaway test data:
//
//   pnpm test:e2e:no-docker --config tests/manual/playwright.manual.config.ts setup-ui-screenshots
//
// Figures go to metricas-memoria/figures (or MEMORIA_FIGURES_DIR) and to artifacts/memoria.

const FIGURES_DIR = path.resolve(
    process.env.MEMORIA_FIGURES_DIR ?? path.join(process.cwd(), 'metricas-memoria/figures')
);

const COPY_DIR = path.resolve(process.cwd(), 'artifacts/memoria');
const MOBILE = { width: 390, height: 844 };

const HOME = 'Casa';
const BOOK_CLUB = 'Club de lectura';
const ELECTRICITY = 'Bajar la factura de la luz a 60 €';
const UKULELE = 'Aprender a tocar el ukelele';
const COFFEE = 'Dejar el café';
const PARTNER = 'Javier Ruiz';
const SISTER = 'Carmen Fernández';
const NEWCOMER = { username: 'Pablo Ortega', email: 'pablo.ortega@example.com' };

async function hideTransientUi(page: Page): Promise<void> {
    await page.evaluate(() => {
        document
            .querySelectorAll(
                [
                    '[data-sonner-toaster]',
                    '[data-loading]',
                    '[data-nextjs-dialog]',
                    '[data-nextjs-toast]',
                    '[data-next-badge]',
                    '[data-next-badge-root]',
                    'nextjs-portal',
                    '#__next-build-watcher',
                ].join(', ')
            )
            .forEach(element => {
                if (element instanceof HTMLElement) {
                    element.style.display = 'none';
                }
            });
    });
    await page.waitForTimeout(300);
}

function save(filename: string, buffer: Buffer): void {
    for (const dir of [FIGURES_DIR, COPY_DIR]) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), buffer);
    }

    console.log(`Wrote figure: ${filename}`);
}

async function capture(page: Page, filename: string, options?: { fullPage?: boolean }) {
    await hideTransientUi(page);
    save(
        filename,
        await page.screenshot({ fullPage: options?.fullPage ?? false, animations: 'disabled' })
    );
}

// The top of an objective's detail page down to its chart: header, progress, pace and evolution.
async function captureObjectiveSummary(page: Page, filename: string): Promise<void> {
    const chart = page.getByTestId('progress-chart');
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await hideTransientUi(page);
    const box = await chart.boundingBox();

    if (!box) {
        throw new Error(`No chart to frame in ${filename}`);
    }

    // A full-page capture leaves the fixed sidebar blank, so frame the main column only.
    const main = await page.getByRole('main').boundingBox();
    const left = Math.floor(main?.x ?? 0);
    const scrollY = await page.evaluate(() => window.scrollY);
    const height = Math.ceil(box.y + scrollY + box.height + 24);
    save(
        filename,
        await page.screenshot({
            fullPage: true,
            animations: 'disabled',
            clip: { x: left, y: 0, width: VIEWPORT.width - left, height },
        })
    );
}

async function settle(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);
}

async function scrollTo(page: Page, testId: string, margin = 16): Promise<void> {
    await page
        .getByTestId(testId)
        .first()
        .evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.evaluate(offset => window.scrollBy(0, -offset), margin);
    await page.waitForTimeout(400);
}

async function openOrganization(page: Page, name: string): Promise<void> {
    await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
    await page
        .getByTestId('table-row')
        .filter({ hasText: name })
        .first()
        .getByTestId('organization-detail-link')
        .click();
    await page.waitForURL(/\/dashboard\/organizations\/[^/?]+/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
}

async function invite(page: Page, organization: string, email: string): Promise<void> {
    await openOrganization(page, organization);
    await page.getByTestId('organization-member-create-open').click();
    await page.getByTestId('organization-member-email-input').fill(email);
    await page.getByTestId('organization-member-save-button').click();
    await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
        timeout: 20_000,
    });
}

async function acceptInvitations(page: Page, email: string, count: number): Promise<void> {
    await page.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
    await verifyEmailFromInvitationPage(page, email);

    for (let accepted = 0; accepted < count; accepted++) {
        await page.getByTestId('invitation-accept-button').first().click();
        await page.getByTestId('invitation-accept-confirm-button').click();
        await expect(page.getByTestId('invitation-accept-button')).toHaveCount(
            count - accepted - 1,
            { timeout: 20_000 }
        );
    }
}

async function trashObjective(page: Page, title: string): Promise<void> {
    await createObjective(page, { title, unit: 'días', start: '0', target: '30' });
    await openObjective(page, title);
    await page.getByTestId('objective-delete-button').click();
    await page.getByTestId('delete-confirm-button').click();
    await expect(page).toHaveURL(/\/dashboard\/objectives(?:\?|$)/, { timeout: 15_000 });
}

test('captures the thesis figures from a realistic history', async ({ browser }) => {
    test.setTimeout(30 * 60_000);
    console.log(`Figures directory: ${FIGURES_DIR}`);

    const contexts: BrowserContext[] = [];

    async function newContext() {
        const context = await spanishContext(browser, {});
        contexts.push(context);

        return context;
    }

    try {
        // Setup wizard.
        const page = await (await newContext()).newPage();
        await completeSetup(page, step => capture(page, `setup-${step}.png`, { fullPage: true }));

        // Public pages, seen by someone without a session.
        const visitor = await (await newContext()).newPage();
        await visitor.goto('/', { waitUntil: 'domcontentloaded' });
        await ensureSpanish(visitor);
        await settle(visitor, '/');
        await capture(visitor, 'landing-page-hero.png');
        await settle(visitor, '/login');
        await capture(visitor, 'captura_pantalla_login_desktop.png');
        await visitor.getByTestId('login-button').click();
        await visitor.waitForTimeout(400);
        await capture(visitor, 'validacion-error.png');
        await settle(visitor, '/register');
        await visitor.getByTestId('register-username-input').fill(NEWCOMER.username);
        await visitor.getByTestId('register-email-input').fill(NEWCOMER.email);
        await visitor.getByTestId('register-password-input').fill('Password123');
        await visitor.getByTestId('register-confirm-password-input').fill('Password123');
        await capture(visitor, 'registro.png');
        await settle(visitor, '/forget-password');
        await visitor.getByTestId('email-input').fill(NEWCOMER.email);
        await capture(visitor, 'recuperar-contrasena.png');
        await visitor.setViewportSize(MOBILE);
        await settle(visitor, '/login');
        await capture(visitor, 'captura_pantalla_login_mobile.png');
        await visitor.setViewportSize(VIEWPORT);

        // Months of history, created before any figure that shows it.
        await seedHistory(page);

        // Use case: savings. The creation form, then three contributions on different dates.
        await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
        await page.getByTestId('objective-create-open').click();
        await page.getByTestId('objective-title-input').fill(TRIP);
        await page
            .getByTestId('objective-description-input')
            .fill('Vuelos, alojamiento y el Japan Rail Pass para dos semanas.');
        await page.getByTestId('objective-category-select').click();
        await page.getByRole('option', { name: /Finanzas|Finance/ }).click();
        await page.getByTestId('objective-unit-input').fill('€');
        await page.getByTestId('objective-start-input').fill('0');
        await page.getByTestId('objective-target-input').fill('3000');
        await page.getByTestId('objective-deadline-input').fill('dentro de 6 meses');
        await page.getByTestId('objective-deadline-input').blur();
        await page.waitForTimeout(400);

        // The dialog scrolls inside a 900 px viewport; grow the viewport until it fits whole.
        const dialog = page.getByRole('dialog');
        let viewportHeight = VIEWPORT.height;

        for (let attempt = 0; attempt < 6; attempt++) {
            const hidden = await dialog.evaluate(element => {
                let overflow = Math.max(0, element.scrollHeight - element.clientHeight);

                element.querySelectorAll('*').forEach(child => {
                    overflow = Math.max(overflow, child.scrollHeight - child.clientHeight);
                });

                return overflow;
            });

            if (hidden <= 1) {
                break;
            }

            viewportHeight += hidden + 40;
            await page.setViewportSize({ width: VIEWPORT.width, height: viewportHeight });
            await page.waitForTimeout(400);
        }

        await capture(page, 'objetivos-crear-formulario.png');
        await page.getByTestId('objective-save-button').click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await page.setViewportSize(VIEWPORT);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await capture(page, 'objetivos-creado.png');

        await openObjective(page, TRIP);
        await logProgress(page, {
            amount: '450',
            date: 'hace 2 meses',
            comment: 'Extra de verano',
        });
        await logProgress(page, {
            amount: '380',
            date: 'hace 1 mes',
            comment: 'Ahorro de la nómina',
        });
        await logProgress(page, { amount: '250', comment: 'Venta de la bici antigua' });
        await captureObjectiveSummary(page, 'caso-ahorro.png');

        // Use cases: gym attendance and reading time, with the session and the book of today.
        await openObjective(page, GYM);
        await logProgress(page, { amount: '1', comment: 'Pierna y core' });
        await captureObjectiveSummary(page, 'caso-gimnasio.png');

        await openObjective(page, READING);
        await logProgress(page, { amount: '2.5', comment: 'El infinito en un junco' });
        await captureObjectiveSummary(page, 'caso-lectura.png');
        await scrollTo(page, 'progress-list', 72);
        await capture(page, 'caso-lectura-historial.png');

        await openObjective(page, WEIGHT);
        await logProgress(page, { amount: '79.2', total: true, comment: 'Control mensual' });
        await captureObjectiveSummary(page, 'caso-peso.png');

        // Progress screens, on the English course.
        await openObjective(page, ENGLISH);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);
        await capture(page, 'progreso-detalle.png');
        await page.getByTestId('progress-value-input').fill('6');
        await page.getByTestId('progress-date-input').fill('hace 2 días');
        await page.getByTestId('progress-comment-input').fill('Unidad 6: phrasal verbs');
        await scrollTo(page, 'progress-value-input');
        await page.evaluate(() => window.scrollBy(0, -140));
        await capture(page, 'progreso-formulario.png');
        const entries = await page.getByTestId('progress-entry-value').count();
        await page.getByTestId('progress-save-button').click();
        await expect(page.getByTestId('progress-entry-value')).toHaveCount(entries + 1, {
            timeout: 15_000,
        });
        await scrollTo(page, 'progress-list', 72);
        await capture(page, 'progreso-tabla.png');

        await openObjective(page, RUNNING);
        await expect(page.getByTestId('progress-chart')).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(800);
        await capture(page, 'progreso-timeline.png', { fullPage: true });

        // Goals she gave up on, for the trash.
        await trashObjective(page, UKULELE);
        await trashObjective(page, COFFEE);
        await page.getByTestId('objectives-trash-link').click();
        await expect(page.getByTestId('table-row')).toHaveCount(2, { timeout: 15_000 });
        await page.waitForLoadState('networkidle');
        await capture(page, 'papelera.png');

        // Objective list, filters and dashboard.
        await settle(page, '/dashboard/objectives');
        await capture(page, 'objetivos-lista.png');
        await page.getByTestId('objectives-filter-active').click();
        await page.getByTestId('objectives-deadline-filter-week').click();
        await page.waitForTimeout(600);
        await page.getByTestId('objectives-category-filter').click();
        await page.waitForTimeout(400);
        await capture(page, 'objetivos-filtros.png');
        await page.keyboard.press('Escape');

        await settle(page, '/dashboard/home');
        await capture(page, 'captura_pantalla_inicial_desktop.png');
        const sidebar = page.getByTestId('app-sidebar');
        await hideTransientUi(page);
        save('navegacion-sidebar.png', await sidebar.screenshot({ animations: 'disabled' }));

        await expect(page.getByTestId('command-menu-ready')).toBeAttached({ timeout: 15_000 });
        await page.keyboard.press('Control+k');
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(400);
        await capture(page, 'paleta-comandos.png');
        await page.keyboard.press('Escape');

        // The sidebar capture scrolls the layout a few pixels; reload so the menus sit at the top.
        await settle(page, '/dashboard/home');
        await page.getByTestId('dashboard-theme-toggle').click();
        await page.waitForTimeout(400);
        await capture(page, 'tema-selector.png');
        await page.getByTestId('theme-option-dark').click();
        await page.waitForTimeout(800);
        await capture(page, 'tema-oscuro-dashboard.png');
        await page.getByTestId('language-switcher').first().click();
        await page.waitForTimeout(400);
        await capture(page, 'idioma-selector.png');
        await page.keyboard.press('Escape');
        await page.getByTestId('dashboard-theme-toggle').click();
        await page.getByTestId('theme-option-light').click();

        // The same objectives with the interface in English.
        const origin = new URL(page.url()).origin;
        await page.context().addCookies([{ name: 'locale', value: 'en', url: origin }]);
        await settle(page, '/dashboard/objectives');
        await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 15_000 });
        await capture(page, 'idioma-ingles.png');
        await page.context().addCookies([{ name: 'locale', value: 'es', url: origin }]);
        await settle(page, '/dashboard/home');
        await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 15_000 });

        const phone = await (await newContext()).newPage();
        await phone.setViewportSize(MOBILE);
        await loginUser(phone, OWNER.email, OWNER.password);
        await useOrganization(phone, ORGANIZATION);
        await settle(phone, '/dashboard/home');
        await capture(phone, 'captura_pantalla_inicial_mobile.png');
        await settle(phone, '/dashboard/objectives');
        await capture(phone, 'objetivos-mobile.png');

        await settle(page, '/dashboard/categories');
        await capture(page, 'categorias.png');
        await settle(page, '/dashboard/achievements');
        await capture(page, 'logros-overview.png');

        // A shared household with her partner, and a book club her sister is invited to.
        const partnerPage = await (await newContext()).newPage();
        const partner = await createTestUser(partnerPage, { customUsername: PARTNER });
        const sisterPage = await (await newContext()).newPage();
        const sister = await createTestUser(sisterPage, { customUsername: SISTER });

        await createOrganization(page, { name: HOME });
        await createOrganization(page, { name: BOOK_CLUB });
        await invite(page, HOME, partner.email);
        await acceptInvitations(partnerPage, partner.email, 1);

        await settle(page, '/dashboard/home');
        await useOrganization(page, HOME);
        await seedObjective(
            page,
            {
                title: ELECTRICITY,
                description: 'Media de la factura mensual de la casa.',
                unit: '€',
                start: '95',
                target: '60',
                deadline: 'dentro de 3 meses',
                decrease: true,
            },
            ['88', '81', '74'].map((amount, index) => ({
                amount,
                total: true,
                date: `hace ${3 - index} meses`,
            }))
        );
        await page.getByTestId('objective-access-open').click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
        await page.getByTestId('objective-user-access-select').click();
        await page.getByRole('option', { name: /Javier/ }).click();
        await page.getByTestId('objective-user-access-level').click();
        await page.getByRole('option', { name: /editar/i }).click();
        await page.getByTestId('objective-user-access-add').click();
        await expect(
            page.getByTestId('objective-user-access-list').getByText(/Javier/)
        ).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(600);
        await capture(page, 'permisos-objetivo.png');
        await page.keyboard.press('Escape');

        await invite(page, HOME, sister.email);
        await invite(page, BOOK_CLUB, sister.email);
        const invitedAt = Date.now();
        await invite(page, BOOK_CLUB, NEWCOMER.email);
        const invitationUrl = await waitForInvitationUrl(page, NEWCOMER.email, invitedAt);
        await settle(visitor, new URL(invitationUrl).pathname);
        await capture(visitor, 'invitacion-publica.png');

        await sisterPage.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
        await verifyEmailFromInvitationPage(sisterPage, sister.email);
        await expect(sisterPage.getByTestId('invitation-accept-button')).toHaveCount(2, {
            timeout: 20_000,
        });
        await sisterPage.waitForLoadState('networkidle');
        await sisterPage.waitForTimeout(600);
        await capture(sisterPage, 'invitaciones-centro.png');

        await settle(page, '/dashboard/organizations');
        await capture(page, 'organizaciones-lista.png');
        await openOrganization(page, HOME);
        await page.waitForTimeout(700);
        await capture(page, 'organizaciones-miembros.png');

        await openOrganization(partnerPage, HOME);
        await partnerPage.getByTestId('organization-leave').click();
        await expect(partnerPage.getByTestId('delete-confirm-button')).toBeVisible();
        await partnerPage.waitForTimeout(400);
        await capture(partnerPage, 'abandonar-organizacion.png');
        await partnerPage.keyboard.press('Escape');

        await settle(page, '/dashboard/home');
        await page.getByTestId('organization-switcher').first().click();
        await page.waitForTimeout(500);
        await capture(page, 'organizacion-selector.png');
        await page.keyboard.press('Escape');
        await useOrganization(page, ORGANIZATION);

        // Notifications, account and sessions.
        await settle(page, '/dashboard/home');
        await expect(page.getByTestId('notification-bell-count')).toBeVisible({ timeout: 20_000 });
        await page.getByTestId('notification-bell').click();
        await expect(page.getByTestId('notification-row').first()).toBeVisible({
            timeout: 15_000,
        });
        await page.waitForTimeout(500);
        await capture(page, 'notificaciones-campana.png');
        await page.keyboard.press('Escape');
        await settle(page, '/dashboard/notifications');
        await capture(page, 'notificaciones-lista.png');
        await settle(page, '/dashboard/sessions');
        await capture(page, 'sesiones-lista.png');

        await settle(page, '/dashboard/settings');
        await expect(page.getByTestId('settings-name-input')).toHaveValue(OWNER.username, {
            timeout: 15_000,
        });
        await capture(page, 'ajustes.png', { fullPage: true });
        await page.getByTestId('settings-currentPassword-input').fill(OWNER.password);
        await page.getByTestId('settings-newPassword-input').fill('NuevaClave2026');
        await page.getByTestId('settings-confirmPassword-input').fill('NuevaClave2026');
        await page.getByTestId('settings-password-save').scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await capture(page, 'cambiar-contrasena.png');

        // Administration.
        await settle(page, '/dashboard/admin');
        await expect(page.getByTestId('admin-users')).toBeVisible({ timeout: 15_000 });
        const partnerRow = page.getByTestId('table-row').filter({ hasText: partner.email });
        await expect(partnerRow).toHaveCount(1, { timeout: 15_000 });
        await page.waitForTimeout(600);
        await capture(page, 'admin-panel-usuarios.png');
        await partnerRow.getByTestId('admin-sessions-open').click();
        await expect(page.getByTestId('admin-sessions-list').locator('li').first()).toBeVisible({
            timeout: 15_000,
        });
        await page.waitForTimeout(400);
        await capture(page, 'admin-panel-sesiones.png');
        await page.keyboard.press('Escape');
        await scrollTo(page, 'admin-audit');
        await capture(page, 'admin-panel-auditoria.png');
    } finally {
        await Promise.all(contexts.map(context => context.close()));
    }
});
