import { test, expect } from '@playwright/test';
import { createObjective } from '../../helpers/test-helpers';

async function openObjectiveDetailFromList(page: import('@playwright/test').Page): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

    const rowWithProgressLink = page
        .getByTestId('table-row')
        .filter({ has: page.getByTestId('objective-progress-link') })
        .first();
    await expect(rowWithProgressLink).toBeVisible({ timeout: 10000 });
    const progressLink = rowWithProgressLink.getByTestId('objective-progress-link').first();
    const href = await progressLink.getAttribute('href');
    if (href) {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
    } else {
        await Promise.all([
            page.waitForURL(/\/dashboard\/objectives\/.+/, { timeout: 10000 }),
            progressLink.click(),
        ]);
    }

    await expect(page).toHaveURL(/\/dashboard\/objectives\/.+/);
    await page.waitForSelector('[data-testid="progress-create-open"]', { timeout: 10000 });
}

async function createProgressUpdate(
    page: import('@playwright/test').Page,
    value: string,
    comment: string
): Promise<void> {
    let modalOpened = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByTestId('progress-create-open').click();
        try {
            await expect(page.getByTestId('progress-value-input')).toBeVisible({ timeout: 5000 });
            modalOpened = true;
            break;
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
    }

    if (!modalOpened) {
        throw new Error('Could not open create progress modal');
    }

    await page.getByTestId('progress-value-input').fill(value);
    await page.getByTestId('progress-comment-input').fill(comment);

    let saved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByTestId('progress-save-button').click();
        try {
            await expect(page.getByTestId('progress-value-input')).toHaveCount(0, {
                timeout: 5000,
            });
            saved = true;
            break;
        } catch {
            // Retry save on next iteration
        }
    }

    if (!saved) {
        throw new Error('Could not save progress update');
    }
}

test.describe('Objectives Progress Updates', () => {
    test(
        'create progress update from objective detail',
        { tag: ['@REQ-PROGRESO-001', '@REQ-OBJETIVOS-012'] },
        async ({ page }) => {
            const objective = await createObjective(page, {
                title: `Progress create ${Date.now()}`,
                targetValue: 100,
            });

            await openObjectiveDetailFromList(page);
            await createProgressUpdate(page, '35', 'First progress entry');

            await expect(
                page.getByTestId('table-row').filter({ hasText: 'First progress entry' }).first()
            ).toBeVisible({ timeout: 10000 });
            await expect(page).toHaveURL(/\/dashboard\/objectives\/.+/);
        }
    );

    test('edit progress update', { tag: ['@REQ-PROGRESO-003'] }, async ({ page }) => {
        await createObjective(page, {
            title: `Progress edit ${Date.now()}`,
            targetValue: 100,
        });

        await openObjectiveDetailFromList(page);
        await createProgressUpdate(page, '20', 'Comment before edit');

        const progressRow = page
            .getByTestId('table-row')
            .filter({ hasText: 'Comment before edit' })
            .first();
        await expect(progressRow).toBeVisible({ timeout: 10000 });
        await progressRow.getByTestId('progress-edit-open').click();
        await expect(page.getByTestId('progress-edit-value-input').first()).toBeVisible({
            timeout: 10000,
        });

        await page.getByTestId('progress-edit-value-input').first().clear();
        await page.getByTestId('progress-edit-value-input').first().fill('30');
        await page.getByTestId('progress-edit-comment-input').first().fill('Comment after edit');
        await page.getByTestId('progress-edit-save-button').first().click();
        await page.waitForURL(/\/dashboard\/objectives\/.+/, { timeout: 10000 });

        await expect(page.getByText('Comment after edit')).toBeVisible({ timeout: 10000 });
    });

    test('delete progress update', { tag: ['@REQ-PROGRESO-003'] }, async ({ page }) => {
        await createObjective(page, {
            title: `Progress delete ${Date.now()}`,
            targetValue: 100,
        });

        await openObjectiveDetailFromList(page);
        await createProgressUpdate(page, '15', 'Delete me progress');
        const progressRow = page
            .getByTestId('table-row')
            .filter({ hasText: 'Delete me progress' })
            .first();
        await expect(progressRow).toBeVisible();

        await progressRow.getByTestId('progress-delete-button').click();

        const confirmDialog = page.locator(
            '[data-slot="alert-dialog-content"], [role="alertdialog"]'
        );
        await expect(confirmDialog.first()).toBeVisible({ timeout: 10000 });

        const confirmButton = confirmDialog.first().getByTestId('delete-confirm-button');
        await confirmButton.click();
        await page.waitForURL(/\/dashboard\/objectives\/.+/, { timeout: 10000 });

        await expect(page.getByText('Delete me progress')).toHaveCount(0);
    });

    test(
        'objective auto-completes when progress reaches target',
        { tag: ['@REQ-OBJETIVOS-007', '@REQ-PROGRESO-005'] },
        async ({ page }) => {
            const objective = await createObjective(page, {
                title: `Auto complete ${Date.now()}`,
                targetValue: 100,
            });

            await openObjectiveDetailFromList(page);
            await createProgressUpdate(page, '100', 'Reached target');

            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            const objectiveRow = page
                .getByTestId('table-row')
                .filter({ hasText: objective.title })
                .first();
            await expect(objectiveRow).toBeVisible({ timeout: 10000 });
            await expect(objectiveRow).toContainText(/completed|completado/i);
        }
    );
});
