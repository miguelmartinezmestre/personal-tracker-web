import { expect, type Browser, type Page } from '@playwright/test';
import { generateTestUserData } from '../helpers/test-helpers';

// The story shared by the showcase video and the thesis screenshots: Lucía sets up the platform in
// Spanish and keeps her personal goals in «Mis metas», with months of history behind each one.

export const VIEWPORT = { width: 1440, height: 900 };
export const ORGANIZATION = 'Mis metas';
export const OWNER = generateTestUserData({ customUsername: 'Lucía Fernández' });

export interface ObjectiveSpec {
    title: string;
    description?: string;
    category?: RegExp;
    unit: string;
    start: string;
    target: string;
    deadline?: string;
    decrease?: boolean;
}

export interface ProgressSpec {
    amount: string;
    date?: string;
    comment?: string;
    total?: boolean;
}

export async function spanishContext(
    browser: Browser,
    options: Parameters<Browser['newContext']>[0]
) {
    const context = await browser.newContext({ viewport: VIEWPORT, ...options });
    // The manual config sets no action timeout, so a stuck click would otherwise wait forever.
    context.setDefaultTimeout(20_000);
    context.setDefaultNavigationTimeout(45_000);

    return context;
}

// Sets the Spanish locale cookie on the origin the page actually loaded, then confirms it applies.
export async function ensureSpanish(page: Page): Promise<void> {
    const origin = new URL(page.url()).origin;
    await page.context().addCookies([{ name: 'locale', value: 'es', url: origin }]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 15_000 });
}

export async function useOrganization(page: Page, name: string): Promise<void> {
    const switcher = page.getByTestId('organization-switcher').first();
    await expect(switcher).toBeVisible({ timeout: 30_000 });

    // The switcher renders before it knows the active organization, so give it a moment.
    const alreadyActive = await expect(switcher)
        .toContainText(name, { timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

    if (alreadyActive) {
        return;
    }

    await switcher.click();
    await page.locator('[data-testid^="organization-option-"]').filter({ hasText: name }).click();
    await expect(switcher).toContainText(name, { timeout: 15_000 });
}

// `capture` is called at the end of each wizard step, once its fields are filled in.
export async function completeSetup(
    page: Page,
    capture: (step: string) => Promise<void> = async () => {}
): Promise<void> {
    await page.goto('/setup', { waitUntil: 'domcontentloaded' });
    await ensureSpanish(page);
    const platformName = page.getByTestId('setup-platform-name');
    await expect(platformName).toBeVisible({ timeout: 30_000 });
    await platformName.fill('Personal Tracker');
    // The wizard writes this language to the locale cookie when it finishes.
    await page.getByTestId('setup-language-select').click();
    await page.getByRole('option', { name: /Español/ }).click();
    await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
    await capture('platform');
    await page.getByTestId('setup-next-button').click();

    await page.getByTestId('setup-username').fill(OWNER.username);
    await page.getByTestId('setup-email').fill(OWNER.email);
    await page.getByTestId('setup-password').fill(OWNER.password);
    await page.getByTestId('setup-confirm-password').fill(OWNER.password);

    if (process.env.SETUP_SECRET) {
        await page.getByTestId('setup-secret').fill(process.env.SETUP_SECRET);
    }

    await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
    await capture('admin');
    await page.getByTestId('setup-next-button').click();
    await page.getByTestId('setup-org-name').fill(ORGANIZATION);
    await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
    await capture('org');
    await page.getByTestId('setup-next-button').click();
    await expect(page.getByTestId('setup-next-button')).toBeEnabled({ timeout: 10_000 });
    await capture('categories');
    await page.getByTestId('setup-next-button').click();
    await page.locator('label[for="policy-open"]').click();
    await expect(page.locator('#policy-open')).toBeChecked();
    await capture('registration-policy');
    await page.getByTestId('setup-next-button').click();
    await expect(page.getByTestId('setup-complete-button')).toBeVisible({ timeout: 10_000 });
    await capture('summary');
    await page.getByTestId('setup-complete-button').click();
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 45_000 });
    await useOrganization(page, ORGANIZATION);
}

export async function openObjective(page: Page, title: string): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('objective-row-link').filter({ hasText: title }).click();
    await expect(page.getByTestId('objective-detail-title')).toHaveText(title, {
        timeout: 15_000,
    });
}

export async function createObjective(page: Page, objective: ObjectiveSpec): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(objective.title);

    if (objective.description) {
        await page.getByTestId('objective-description-input').fill(objective.description);
    }

    if (objective.category) {
        await page.getByTestId('objective-category-select').click();
        await page.getByRole('option', { name: objective.category }).click();
    }

    if (objective.decrease) {
        await page.getByTestId('objective-direction-decrease').click();
    }

    await page.getByTestId('objective-unit-input').fill(objective.unit);
    await page.getByTestId('objective-start-input').fill(objective.start);
    await page.getByTestId('objective-target-input').fill(objective.target);

    if (objective.deadline) {
        await page.getByTestId('objective-deadline-input').fill(objective.deadline);
    }

    await page.getByTestId('objective-save-button').click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });
}

export async function logProgress(page: Page, entry: ProgressSpec): Promise<void> {
    // Count the history only once it has loaded, or the count starts from zero.
    await expect(page.getByTestId('progress-list').getByTestId('table')).toBeVisible({
        timeout: 15_000,
    });
    const entries = await page.getByTestId('progress-entry-value').count();

    if (entry.total) {
        await page.getByTestId('progress-mode-value').click();
    }

    await page.getByTestId('progress-value-input').fill(entry.amount);

    if (entry.date) {
        await page.getByTestId('progress-date-input').fill(entry.date);
    }

    if (entry.comment) {
        await page.getByTestId('progress-comment-input').fill(entry.comment);
    }

    await page.getByTestId('progress-save-button').click();
    await expect(page.getByTestId('progress-entry-value')).toHaveCount(entries + 1, {
        timeout: 15_000,
    });
}

export async function seedObjective(page: Page, objective: ObjectiveSpec, history: ProgressSpec[]) {
    await createObjective(page, objective);
    await openObjective(page, objective.title);

    for (const entry of history) {
        await logProgress(page, entry);
    }
}

export const GYM = 'Ir al gimnasio 3 veces por semana';
export const READING = 'Leer 100 horas este año';
export const WEIGHT = 'Bajar a 75 kg';
export const RUNNING = 'Correr 400 km';
export const ENGLISH = 'Completar 120 lecciones de inglés';
export const EMERGENCY_FUND = 'Fondo de emergencia de 2.000 €';
export const MEDITATION = 'Meditar 30 días seguidos';
export const TRIP = 'Ahorrar 3.000 € para el viaje a Japón';

export async function seedHistory(page: Page): Promise<void> {
    const gymWeeks = [3, 3, 2, 3, 3, 1, 3, 3, 2, 3, 3, 3, 2, 3, 3, 2];
    await seedObjective(
        page,
        {
            title: GYM,
            description: 'Rutina de fuerza lunes, miércoles y viernes.',
            category: /Forma física|Fitness/,
            unit: 'sesiones',
            start: '0',
            target: '120',
            deadline: '31/12/2026',
        },
        gymWeeks.map((amount, index) => ({
            amount: String(amount),
            date: `hace ${gymWeeks.length - index} semanas`,
            comment: amount === 1 ? 'Semana con gripe' : undefined,
        }))
    );

    const books = [
        { amount: '6', comment: 'Cien años de soledad' },
        { amount: '4.5', comment: 'Cien años de soledad' },
        { amount: '5', comment: 'Sapiens' },
        { amount: '3', comment: 'Sapiens' },
        { amount: '7', comment: 'El nombre del viento' },
        { amount: '6.5', comment: 'El nombre del viento' },
        { amount: '4', comment: 'Patria' },
        { amount: '5.5', comment: 'Patria' },
        { amount: '3.5', comment: 'El infinito en un junco' },
    ];

    await seedObjective(
        page,
        {
            title: READING,
            description: 'Media hora antes de dormir, en papel o en el e-reader.',
            category: /Educación|Education/,
            unit: 'horas',
            start: '0',
            target: '100',
            deadline: '31/12/2026',
        },
        books.map(({ amount, comment }, index) => ({
            amount,
            comment,
            date: `hace ${(books.length - index) * 2} semanas`,
        }))
    );

    const weights = ['83.1', '82.4', '81.9', '81.0', '80.6', '79.8'];
    await seedObjective(
        page,
        {
            title: WEIGHT,
            description: 'Con dieta mediterránea y sin bebidas azucaradas.',
            category: /Salud|Health/,
            unit: 'kg',
            start: '84',
            target: '75',
            deadline: '30/06/2027',
            decrease: true,
        },
        weights.map((amount, index) => ({
            amount,
            total: true,
            date: `hace ${weights.length - index} meses`,
        }))
    );

    const runs = ['42', '38', '51', '47', '35', '55', '44'];
    await seedObjective(
        page,
        {
            title: RUNNING,
            category: /Forma física|Fitness/,
            unit: 'km',
            start: '0',
            target: '400',
            deadline: '31/12/2026',
        },
        runs.map((amount, index) => ({
            amount,
            date: `hace ${(runs.length - index) * 2} semanas`,
            comment: index === 5 ? 'Media maratón de Valencia' : undefined,
        }))
    );

    await seedObjective(
        page,
        {
            title: ENGLISH,
            category: /Educación|Education/,
            unit: 'lecciones',
            start: '0',
            target: '120',
            deadline: 'dentro de 4 meses',
        },
        ['12', '15', '9', '14', '11'].map((amount, index) => ({
            amount,
            date: `hace ${5 - index} semanas`,
        }))
    );

    await seedObjective(
        page,
        {
            title: EMERGENCY_FUND,
            category: /Finanzas|Finance/,
            unit: '€',
            start: '0',
            target: '2000',
        },
        ['500', '500', '400', '600'].map((amount, index) => ({
            amount,
            date: `hace ${8 - index} meses`,
        }))
    );

    await seedObjective(
        page,
        {
            title: MEDITATION,
            description: 'Diez minutos cada mañana.',
            category: /Salud|Health/,
            unit: 'días',
            start: '0',
            target: '30',
            deadline: 'dentro de 7 días',
        },
        [{ amount: '29', date: 'ayer', comment: 'Racha de 29 días' }]
    );
}
