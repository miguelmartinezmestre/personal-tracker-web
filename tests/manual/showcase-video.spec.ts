import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
    completeSetup,
    ensureSpanish,
    GYM,
    MEDITATION,
    ORGANIZATION,
    OWNER,
    type ProgressSpec,
    READING,
    RUNNING,
    seedHistory,
    spanishContext,
    TRIP,
    VIEWPORT,
    WEIGHT,
} from './demo-data';

// Records a narrated walk-through of the app in Spanish, on a freshly set-up platform. The history
// behind each objective is created off camera first, so the recording only shows the user's story.
//
//   pnpm test:e2e:no-docker --config tests/manual/playwright.manual.config.ts showcase-video
//
// The video is written to artifacts/showcase/showcase.webm (the e2e runner wipes test-results).

const OUTPUT_DIR = path.resolve(process.cwd(), 'artifacts/showcase');

// Draws a visible cursor and a caption bar, which the recording would otherwise not show. The
// caption lives in sessionStorage so it survives full page loads.
function installOverlay(): void {
    const ensure = () => {
        const body = document.querySelector('body');

        if (!body) {
            return;
        }

        let cursor = document.getElementById('showcase-cursor');

        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'showcase-cursor';
            Object.assign(cursor.style, {
                position: 'fixed',
                left: '0',
                top: '0',
                width: '26px',
                height: '26px',
                margin: '-13px 0 0 -13px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.28)',
                border: '2px solid rgba(37, 99, 235, 0.95)',
                boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.6)',
                zIndex: '2147483647',
                pointerEvents: 'none',
                transition: 'transform 0.12s ease-out',
                transform: 'translate(-100px, -100px)',
            });
            body.appendChild(cursor);
        }

        let caption = document.getElementById('showcase-caption');
        const stored = sessionStorage.getItem('showcase-caption');

        if (!caption) {
            caption = document.createElement('div');
            caption.id = 'showcase-caption';
            Object.assign(caption.style, {
                position: 'fixed',
                right: '28px',
                bottom: '28px',
                maxWidth: '520px',
                padding: '14px 26px',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.88)',
                color: 'white',
                font: '500 20px/1.35 system-ui, sans-serif',
                textAlign: 'left',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                zIndex: '2147483646',
                pointerEvents: 'none',
                transition: 'opacity 0.3s',
            });
            body.appendChild(caption);
        }

        const text = stored ? (JSON.parse(stored) as { title: string; detail: string }) : null;

        const html = text
            ? `<div style="font-weight:700;font-size:22px">${text.title}</div>` +
              (text.detail ? `<div style="opacity:.85;font-size:17px">${text.detail}</div>` : '')
            : '';

        if (caption.dataset.html !== html) {
            caption.dataset.html = html;
            caption.innerHTML = html;
        }

        caption.style.opacity = html ? '1' : '0';
    };

    let x = -100;
    let y = -100;

    const place = (scale: number) => {
        const cursor = document.getElementById('showcase-cursor');

        if (cursor) {
            cursor.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        }
    };

    window.addEventListener(
        'mousemove',
        event => {
            x = event.clientX;
            y = event.clientY;
            place(1);
        },
        true
    );
    window.addEventListener('mousedown', () => place(0.65), true);
    window.addEventListener('mouseup', () => place(1), true);
    setInterval(ensure, 200);
    document.addEventListener('DOMContentLoaded', ensure);
}

class Director {
    constructor(private readonly page: Page) {}

    async caption(title: string, detail = ''): Promise<void> {
        await this.page.evaluate(
            value => sessionStorage.setItem('showcase-caption', JSON.stringify(value)),
            { title, detail }
        );
        await this.page.waitForTimeout(300);
    }

    async clearCaption(): Promise<void> {
        await this.page.evaluate(() => sessionStorage.removeItem('showcase-caption'));
    }

    async card(title: string, detail: string, ms = 2800): Promise<void> {
        await this.clearCaption();
        await this.page.evaluate(
            ({ title, detail }) => {
                const card = document.createElement('div');
                card.id = 'showcase-card';
                Object.assign(card.style, {
                    position: 'fixed',
                    inset: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '18px',
                    background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
                    color: 'white',
                    font: '700 54px/1.2 system-ui, sans-serif',
                    textAlign: 'center',
                    zIndex: '2147483645',
                    opacity: '0',
                    transition: 'opacity 0.5s',
                });
                card.innerHTML =
                    `<div>${title}</div>` +
                    `<div style="font-weight:400;font-size:26px;opacity:.85;max-width:960px">${detail}</div>`;
                document.body.appendChild(card);
                requestAnimationFrame(() => (card.style.opacity = '1'));
            },
            { title, detail }
        );
        await this.page.waitForTimeout(ms);
        await this.page.evaluate(() => {
            const card = document.getElementById('showcase-card');

            if (card) {
                card.style.opacity = '0';
                setTimeout(() => card.remove(), 500);
            }
        });
        await this.page.waitForTimeout(600);
    }

    async pause(ms = 1200): Promise<void> {
        await this.page.waitForTimeout(ms);
    }

    async pointAt(testId: string, nth = 0): Promise<void> {
        const target = this.page.getByTestId(testId).nth(nth);

        // Pointing is cosmetic: if the element is not on screen, the recording just carries on.
        const visible = await target
            .waitFor({ state: 'visible', timeout: 4_000 })
            .then(() => true)
            .catch(() => false);

        if (!visible) {
            return;
        }

        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();

        if (box) {
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
                steps: 22,
            });
        }
    }

    async click(testId: string, nth = 0): Promise<void> {
        await this.pointAt(testId, nth);
        await this.page.waitForTimeout(180);
        await this.page.getByTestId(testId).nth(nth).click();
    }

    async clickRole(role: 'option' | 'menuitem' | 'link', name: RegExp): Promise<void> {
        const target = this.page.getByRole(role, { name }).first();
        const box = await target.boundingBox();

        if (box) {
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
                steps: 16,
            });
        }

        await this.page.waitForTimeout(150);
        await target.click();
    }

    async clickTestIdPrefix(prefix: string, text: string): Promise<void> {
        const target = this.page.locator(`[data-testid^="${prefix}"]`).filter({ hasText: text });
        const box = await target.first().boundingBox();

        if (box) {
            await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
                steps: 16,
            });
        }

        await this.page.waitForTimeout(200);
        await target.first().click();
    }

    async type(testId: string, text: string): Promise<void> {
        await this.click(testId);
        await this.page.getByTestId(testId).fill('');
        await this.page.getByTestId(testId).pressSequentially(text, { delay: 55 });
        await this.page.waitForTimeout(250);
    }

    async scroll(distance: number): Promise<void> {
        const steps = Math.max(1, Math.round(Math.abs(distance) / 60));

        for (let step = 0; step < steps; step++) {
            await this.page.mouse.wheel(0, Math.sign(distance) * 60);
            await this.page.waitForTimeout(28);
        }

        await this.page.waitForTimeout(500);
    }

    async scrollToTop(): Promise<void> {
        await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await this.page.waitForTimeout(700);
    }

    async openFromList(title: string): Promise<void> {
        const row = this.page.getByTestId('objective-row-link').filter({ hasText: title });
        await expect(row).toBeVisible({ timeout: 15_000 });
        const box = await row.boundingBox();

        if (box) {
            await this.page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 22 });
        }

        await this.page.waitForTimeout(200);
        await row.click();
        await expect(this.page.getByTestId('objective-detail-title')).toHaveText(title, {
            timeout: 15_000,
        });
        await this.page.waitForTimeout(900);
    }

    async logProgress(entry: ProgressSpec): Promise<void> {
        const entries = await this.page.getByTestId('progress-entry-value').count();

        if (entry.total) {
            await this.click('progress-mode-value');
        }

        await this.type('progress-value-input', entry.amount);

        if (entry.date) {
            await this.type('progress-date-input', entry.date);
            await this.pointAt('progress-date-input-reading');
            await this.pause(900);
        }

        if (entry.comment) {
            await this.type('progress-comment-input', entry.comment);
        }

        await this.click('progress-save-button');
        await expect(this.page.getByTestId('progress-entry-value')).toHaveCount(entries + 1, {
            timeout: 15_000,
        });
        await this.pause(1200);
    }

    async navigate(name: string): Promise<void> {
        await this.click(`sidebar-nav-${name}`);
        await this.page.waitForLoadState('networkidle');
        await this.pause(900);
    }
}

async function saveVideo(context: BrowserContext, page: Page): Promise<string> {
    const video = page.video();
    await context.close();

    if (!video) {
        throw new Error('The recording context has no video.');
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const target = path.join(OUTPUT_DIR, 'showcase.webm');
    await video.saveAs(target);
    await video.delete();

    return target;
}

test('records the showcase video', async ({ browser }) => {
    test.setTimeout(20 * 60_000);

    const seedContext = await spanishContext(browser, {});
    const seedPage = await seedContext.newPage();
    await completeSetup(seedPage);
    await seedHistory(seedPage);
    await seedContext.close();

    const context = await spanishContext(browser, {
        recordVideo: { dir: path.join(OUTPUT_DIR, 'raw'), size: VIEWPORT },
    });

    await context.addInitScript(installOverlay);
    const page = await context.newPage();
    const show = new Director(page);

    // Opening.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await ensureSpanish(page);
    await page.waitForLoadState('networkidle');
    await show.card(
        'Personal Tracker',
        'Convierte tus metas en números: ahorro, deporte, lectura… y sigue su progreso cada día.',
        3500
    );
    await show.caption('Una plataforma para medir lo que te importa');
    await show.scroll(500);
    await show.pause(1500);
    await show.scrollToTop();

    await page.goto('/login', { waitUntil: 'networkidle' });
    await show.caption('Inicio de sesión', 'Lucía entra en su cuenta');
    await show.type('email-input', OWNER.email);
    await show.type('password-input', OWNER.password);
    await show.click('login-button');
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.waitForLoadState('networkidle');

    // A new session starts in the personal organization; the objectives live in the shared one.
    await show.caption('Organizaciones', `Lucía cambia a su espacio «${ORGANIZATION}»`);
    await show.click('organization-switcher');
    await show.clickTestIdPrefix('organization-option-', ORGANIZATION);
    await expect(page.getByTestId('organization-switcher').first()).toContainText(ORGANIZATION, {
        timeout: 15_000,
    });
    await page.waitForLoadState('networkidle');

    // Dashboard overview.
    await show.caption('Panel de inicio', 'Estado de todos sus objetivos de un vistazo');
    await show.pause(2200);
    await show.scroll(700);
    await show.caption('Progreso por categoría y actividad mensual');
    await show.pause(2200);
    await show.scroll(700);
    await show.caption('Ranking, próximos plazos y actividad reciente');
    await show.pause(2400);
    await show.scrollToTop();

    // Use case 1: savings.
    await show.card('Caso 1 · Ahorro económico', 'Ahorrar 3.000 € para un viaje a Japón');
    await show.navigate('objectives');
    await show.caption('Nuevo objetivo de ahorro');
    await show.click('objective-create-open');
    await show.type('objective-title-input', TRIP);
    await show.type(
        'objective-description-input',
        'Vuelos, alojamiento y el Japan Rail Pass para dos semanas.'
    );
    await show.click('objective-category-select');
    await show.clickRole('option', /Finanzas|Finance/);
    await show.type('objective-unit-input', '€');
    await show.type('objective-start-input', '0');
    await show.type('objective-target-input', '3000');
    await show.caption('La fecha límite se escribe en lenguaje natural');
    await show.type('objective-deadline-input', 'dentro de 6 meses');
    await show.pointAt('objective-deadline-input-reading');
    await show.pause(1600);
    await show.click('objective-save-button');
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });
    await show.pause(1000);
    await show.openFromList(TRIP);

    await show.caption('Registrar aportaciones', 'También con fecha pasada: «hace 2 meses»');
    await show.logProgress({ amount: '450', date: 'hace 2 meses', comment: 'Extra de verano' });
    await show.logProgress({ amount: '380', date: 'hace 1 mes', comment: 'Ahorro de la nómina' });
    await show.logProgress({ amount: '250', comment: 'Venta de la bici antigua' });
    await show.caption('La gráfica y el porcentaje se actualizan al instante');
    await show.pointAt('objective-progress-percent');
    await show.pause(1500);
    await show.pointAt('progress-chart');
    await show.pause(2200);
    await show.scroll(600);
    await show.caption('Historial de aportaciones', 'Cada registro se puede corregir o eliminar');
    await show.pause(2400);
    await show.scrollToTop();

    // Use case 2: gym attendance.
    await show.card('Caso 2 · Asistencia al gimnasio', '120 sesiones antes de fin de año');
    await show.navigate('objectives');
    await show.caption('Buscar entre los objetivos');
    await show.type('objectives-search', 'gimnasio');
    await show.pause(1200);
    await show.openFromList(GYM);
    await show.caption('Cuatro meses de entrenamientos registrados', 'Y si va al ritmo previsto');
    await show.pointAt('objective-pace');
    await show.pause(1800);
    await show.pointAt('progress-chart');
    await show.pause(2000);
    await show.caption('Sesión de hoy');
    await show.logProgress({ amount: '1', comment: 'Pierna y core' });
    await show.scroll(600);
    await show.pause(2200);
    await show.scrollToTop();

    // Use case 3: reading time.
    await show.card('Caso 3 · Tiempo dedicado a la lectura', '100 horas de lectura este año');
    await show.navigate('objectives');
    await show.openFromList(READING);
    await show.caption('Horas de lectura, con decimales', 'El comentario recuerda qué libro era');
    await show.pointAt('progress-chart');
    await show.pause(1800);
    await show.logProgress({ amount: '2.5', comment: 'El infinito en un junco' });
    await show.scroll(600);
    await show.pause(2200);
    await show.scrollToTop();

    // More use cases.
    await show.card(
        'Y mucho más',
        'Objetivos que bajan, kilómetros, idiomas… cualquier cosa que se pueda medir'
    );
    await show.navigate('objectives');
    await show.openFromList(WEIGHT);
    await show.caption('Objetivos decrecientes: bajar de 84 a 75 kg', 'Se registra el peso actual');
    await show.pointAt('objective-values');
    await show.pause(1500);
    await show.logProgress({ amount: '79.2', total: true, comment: 'Control mensual' });
    await show.pointAt('progress-chart');
    await show.pause(2000);

    await show.navigate('objectives');
    await show.openFromList(RUNNING);
    await show.caption('Kilómetros corridos', 'Con la media maratón anotada en el historial');
    await show.pointAt('progress-chart');
    await show.pause(2200);

    await show.navigate('objectives');
    await show.openFromList(MEDITATION);
    await show.caption('Completar un objetivo', 'Hoy es el día 30 de meditación');
    await show.logProgress({ amount: '1', comment: '¡Reto conseguido!' });
    await expect(page.getByTestId('objective-completed-notice')).toBeVisible({ timeout: 15_000 });
    await show.pointAt('objective-completed-notice');
    await show.pause(2400);

    // Achievements and notifications.
    await show.card('Logros y notificaciones', 'La constancia tiene recompensa');
    await show.navigate('achievements');
    await show.caption('Logros desbloqueados', 'Por crear, completar y mantener rachas');
    await show.pause(2200);
    await show.scroll(500);
    await show.pause(1500);
    await show.scrollToTop();
    await show.caption('Avisos de hitos, objetivos completados y plazos');
    await show.click('notification-bell');
    await show.pause(2800);
    await page.keyboard.press('Escape');

    // Organising the list.
    await show.card('Todo bajo control', 'Filtros por estado, categoría y plazo');
    await show.navigate('objectives');
    await show.caption('Objetivos completados');
    await show.click('objectives-filter-completed');
    await show.pause(1800);
    await show.click('objectives-filter-all');
    await show.caption('Solo los de finanzas');
    await show.click('objectives-category-filter');
    await show.clickRole('option', /Finanzas|Finance/);
    await show.pause(2000);
    await show.caption('Los que vencen este mes');
    await show.click('objectives-category-filter');
    await show.clickRole('option', /Todas|All/);
    await show.click('objectives-deadline-filter-month');
    await show.pause(2000);
    await show.click('objectives-deadline-filter-all');

    // Closing.
    await show.navigate('home');
    await show.caption('Modo oscuro');
    await show.click('dashboard-theme-toggle');
    await show.clickRole('menuitem', /Oscuro|Dark/);
    await show.pause(1800);
    await show.scroll(700);
    await show.pause(1800);
    await show.scrollToTop();
    await show.caption('Paleta de comandos', 'Ctrl + K para moverse por la aplicación');
    await page.keyboard.press('Control+k');
    await show.pause(800);
    await page.getByTestId('command-input').pressSequentially('logros', { delay: 80 });
    await show.pause(900);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/dashboard\/achievements/, { timeout: 15_000 });
    await show.pause(1800);
    await show.card(
        'Personal Tracker',
        'Next.js · React · Convex · Better Auth — Trabajo Fin de Grado, ETSISI UPM',
        4000
    );

    const video = await saveVideo(context, page);
    console.log(`Showcase video: ${video}`);
});
