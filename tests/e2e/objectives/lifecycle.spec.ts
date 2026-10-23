import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createCategory } from '../../helpers/categories';

async function createObjective(
    page: Page,
    title: string,
    target: string,
    start = '0'
): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-start-input').fill(start);
    await page.getByTestId('objective-target-input').fill(target);
}

test.describe('Objectives', () => {
    test(
        'create an objective, log and edit progress, then delete it',
        {
            tag: [
                '@REQ-OBJETIVOS-001',
                '@REQ-OBJETIVOS-006',
                '@REQ-OBJETIVOS-007',
                '@REQ-PROGRESO-003',
            ],
        },
        async ({ page }) => {
            const title = `Read books ${randomUUID().substring(0, 8)}`;
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-start-input').fill('0');
            await page.getByTestId('objective-target-input').fill('10');
            await page.getByTestId('objective-save-button').click();

            const row = page.getByTestId('objective-row-link').filter({ hasText: title });
            await expect(row).toBeVisible({ timeout: 15000 });
            await row.click();
            await expect(page.getByTestId('objective-detail-title')).toHaveText(title, {
                timeout: 15000,
            });

            await page.getByTestId('progress-value-input').fill('4');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('progress-entry-value')).toContainText('4', {
                timeout: 15000,
            });
            await expect(page.getByTestId('objective-progress-percent')).toContainText('40');

            await page.getByTestId('progress-edit-open').click();
            await page.getByTestId('progress-edit-value-input').fill('6');
            await page.getByTestId('progress-edit-save-button').click();
            await expect(page.getByTestId('objective-progress-percent')).toContainText('60', {
                timeout: 15000,
            });

            await page.getByTestId('objective-delete-button').click();
            await page.getByTestId('delete-confirm-button').click();
            await expect(page).toHaveURL(/\/dashboard\/objectives(?:\?|$)/, { timeout: 15000 });
            await expect(page.getByTestId('objectives-title')).toBeVisible();
            await expect(row).toHaveCount(0, { timeout: 15000 });
        }
    );

    test(
        'filters objectives by status, category and title, and shows the assigned category',
        {
            tag: [
                '@REQ-OBJETIVOS-002',
                '@REQ-OBJETIVOS-004',
                '@REQ-OBJETIVOS-008',
                '@REQ-CATEGORIAS-004',
            ],
        },
        async ({ page }) => {
            const suffix = randomUUID().substring(0, 8);
            const doneTitle = `Done goal ${suffix}`;
            const activeTitle = `Active goal ${suffix}`;
            const categoryName = `Sport ${suffix}`;

            await createCategory(page, categoryName);
            await createObjective(page, doneTitle, '1');
            await page.getByTestId('objective-category-select').click();
            await page.getByRole('option', { name: categoryName }).click();
            await page.getByTestId('objective-save-button').click();

            await page.getByTestId('objective-row-link').filter({ hasText: doneTitle }).click();
            await expect(page.getByText(`: ${categoryName}`)).toBeVisible({ timeout: 15000 });
            await page.getByTestId('progress-value-input').fill('1');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('objective-completed-notice')).toBeVisible({
                timeout: 15000,
            });

            await createObjective(page, activeTitle, '10');
            await page.getByTestId('objective-save-button').click();

            const doneRow = page.getByTestId('objective-row-link').filter({ hasText: doneTitle });

            const activeRow = page
                .getByTestId('objective-row-link')
                .filter({ hasText: activeTitle });

            await page.getByTestId('objectives-filter-completed').click();
            await expect(doneRow).toBeVisible({ timeout: 15000 });
            await expect(activeRow).toHaveCount(0);
            await page.getByTestId('objectives-filter-active').click();
            await expect(activeRow).toBeVisible({ timeout: 15000 });
            await expect(doneRow).toHaveCount(0);

            await page.getByTestId('objectives-filter-all').click();
            await page.getByTestId('objectives-category-filter').click();
            await page.getByRole('option', { name: categoryName }).click();
            await expect(doneRow).toBeVisible({ timeout: 15000 });
            await expect(activeRow).toHaveCount(0);
            await page.getByTestId('objectives-category-filter').click();
            await page.getByRole('option').first().click();

            await page.getByTestId('objectives-search').fill('Done');
            await expect(doneRow).toBeVisible({ timeout: 15000 });
            await expect(activeRow).toHaveCount(0);
        }
    );

    test(
        'a decreasing objective with negative values reaches its target as a new value and closes',
        {
            tag: [
                '@REQ-PROGRESO-001',
                '@REQ-OBJETIVOS-003',
                '@INH-OBJ-01',
                '@INH-OBJ-07',
                '@INH-PRO-05',
            ],
        },
        async ({ page }) => {
            const title = `Cut debt ${randomUUID().substring(0, 8)}`;
            await createObjective(page, title, '-3', '5');
            await page.getByTestId('objective-direction-decrease').click();
            await page.getByTestId('objective-save-button').click();
            await page.getByTestId('objective-row-link').filter({ hasText: title }).click();
            await expect(page.getByTestId('objective-detail-title')).toHaveText(title, {
                timeout: 15000,
            });

            await page.getByTestId('progress-mode-value').click();
            await page.getByTestId('progress-value-input').fill('-1');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('objective-progress-percent')).toContainText('75', {
                timeout: 15000,
            });

            await page.getByTestId('progress-mode-value').click();
            await page.getByTestId('progress-value-input').fill('-3');
            await page.getByTestId('progress-save-button').click();
            await expect(page.getByTestId('objective-completed-notice')).toBeVisible({
                timeout: 15000,
            });
            await expect(page.getByTestId('objective-status')).toContainText(/completed/i);
            await expect(page.getByTestId('objective-edit-open')).toHaveCount(0);
            await expect(page.getByTestId('progress-edit-open')).toHaveCount(0);

            const entries = page.getByTestId('progress-entry-value');
            await expect(entries).toHaveText(['-2', '-6']);
            await page.getByTestId('progress-view-value').click();
            await expect(entries).toHaveText(['-3', '-1']);
        }
    );

    test(
        'reads a typed deadline, filters by it and keeps the filter on the detail link',
        { tag: ['@REQ-OBJETIVOS-005', '@INH-OBJ-15', '@INH-OBJ-18'] },
        async ({ page }) => {
            const suffix = randomUUID().substring(0, 8);
            const dueTitle = `Due soon ${suffix}`;
            const openTitle = `No deadline ${suffix}`;

            await createObjective(page, dueTitle, '10');
            await page.getByTestId('objective-deadline-input').fill('tomorrow');
            await expect(page.getByTestId('objective-deadline-input-reading')).toContainText(
                'Date understood'
            );
            await expect(page.getByTestId('objective-due-soon-input')).toHaveValue('7');
            await page.getByTestId('objective-save-button').click();

            const dueRow = page.getByTestId('objective-row-link').filter({ hasText: dueTitle });
            const openRow = page.getByTestId('objective-row-link').filter({ hasText: openTitle });
            await expect(dueRow).toBeVisible({ timeout: 15000 });
            await createObjective(page, openTitle, '10');
            await page.getByTestId('objective-save-button').click();
            await expect(openRow).toBeVisible({ timeout: 15000 });

            await page.getByTestId('objectives-deadline-filter-week').click();
            await expect(page).toHaveURL(/\/dashboard\/objectives\?deadline=week$/);
            await expect(dueRow).toBeVisible({ timeout: 15000 });
            await expect(openRow).toHaveCount(0);

            await dueRow.click();
            await expect(page.getByTestId('objective-detail-title')).toHaveText(dueTitle, {
                timeout: 15000,
            });
            await page.getByRole('link', { name: /back/i }).click();
            await expect(page).toHaveURL(/\/dashboard\/objectives\?deadline=week$/);
            await expect(dueRow).toBeVisible({ timeout: 15000 });
            await expect(openRow).toHaveCount(0);
        }
    );
});
