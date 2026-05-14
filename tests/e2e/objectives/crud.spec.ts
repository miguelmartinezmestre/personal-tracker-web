import { test, expect } from '../../fixtures/test-base';
import { ensureDefaultCategories } from '../../helpers/test-helpers';

async function openObjectivesPage(page: import('@playwright/test').Page): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
}

async function selectObjectiveCategory(page: import('@playwright/test').Page): Promise<void> {
    await page.getByTestId('objective-category-select').click();
    await page.waitForSelector('[role="option"]', { timeout: 10000 });

    const personalOption = page
        .getByRole('option')
        .filter({ hasText: /personal/i })
        .first();

    if ((await personalOption.count()) > 0) {
        await personalOption.click();
        return;
    }

    await page.getByRole('option').first().click();
}

async function createObjectiveFromModal(
    page: import('@playwright/test').Page,
    params: { title: string; target?: string; unit?: string; scope?: 'personal' | 'organization' }
): Promise<void> {
    let modalOpened = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByTestId('objective-create-open').click();
        try {
            await page.waitForSelector('[data-testid="objective-title-input"]', { timeout: 5000 });
            modalOpened = true;
            break;
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
    }

    if (!modalOpened) {
        throw new Error('Could not open create objective modal');
    }

    await page.getByTestId('objective-title-input').fill(params.title);

    if (params.scope === 'organization') {
        await page.getByTestId('objective-scope-select').click();
        await page.getByTestId('objective-scope-organization').click();
    }

    await selectObjectiveCategory(page);
    await page.getByTestId('objective-target-input').fill(params.target ?? '100');
    await page.getByTestId('objective-unit-input').fill(params.unit ?? 'units');
    await page.getByTestId('objective-save-button').click();
}

function objectiveRow(page: import('@playwright/test').Page, title: string) {
    return page.getByTestId('table-row').filter({ hasText: title }).first();
}

test.describe('Objectives CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await ensureDefaultCategories(page);
    });

    test(
        'create personal objective',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-OBJETIVOS-005'] },
        async ({ page }) => {
            const title = `Personal objective ${Date.now()}`;
            await openObjectivesPage(page);

            await createObjectiveFromModal(page, {
                title,
                target: '120',
                unit: 'points',
            });

            await expect(objectiveRow(page, title)).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        'create organization objective',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-OBJETIVOS-005'] },
        async ({ page }) => {
            const title = `Organization objective ${Date.now()}`;
            await openObjectivesPage(page);

            await createObjectiveFromModal(page, {
                title,
                target: '75',
                unit: 'tasks',
                scope: 'organization',
            });

            await expect(objectiveRow(page, title)).toBeVisible({ timeout: 10000 });
        }
    );

    test('edit objective title and scope', { tag: ['@REQ-OBJETIVOS-003'] }, async ({ page }) => {
        const originalTitle = `Edit objective ${Date.now()}`;
        const updatedTitle = `Edited objective ${Date.now()}`;

        await openObjectivesPage(page);
        await createObjectiveFromModal(page, {
            title: originalTitle,
            scope: 'personal',
        });

        const originalRow = objectiveRow(page, originalTitle);
        await expect(originalRow).toBeVisible({ timeout: 10000 });

        let editModalOpened = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            await originalRow.getByTestId('objective-edit-open').click();
            try {
                await expect(page.getByTestId('objective-edit-title-input')).toBeVisible({
                    timeout: 5000,
                });
                editModalOpened = true;
                break;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
            }
        }

        if (!editModalOpened) {
            throw new Error('Could not open edit objective modal');
        }

        let scopeChanged = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await page.getByTestId('objective-edit-scope-select').click();
                await expect(page.getByTestId('objective-edit-scope-organization')).toBeVisible({
                    timeout: 5000,
                });
                await page.getByTestId('objective-edit-scope-organization').click();
                scopeChanged = true;
                break;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
                if (attempt < 2) {
                    await originalRow.getByTestId('objective-edit-open').click();
                    await expect(page.getByTestId('objective-edit-title-input')).toBeVisible({
                        timeout: 5000,
                    });
                }
            }
        }

        if (!scopeChanged) {
            throw new Error('Could not change objective scope in edit modal');
        }

        const editTitleInput = page.getByTestId('objective-edit-title-input');
        await editTitleInput.clear();
        await editTitleInput.fill(updatedTitle);
        await expect(editTitleInput).toHaveValue(updatedTitle);

        await page.getByTestId('objective-edit-save-button').click();
        await page.waitForURL(/\/dashboard\/objectives(\?|$)/, { timeout: 10000 });

        let titleCount = 0;
        const maxTime = Date.now() + 10000;

        while (Date.now() < maxTime && titleCount === 0) {
            titleCount = await page.getByText(updatedTitle).count();
            if (titleCount === 0) {
                await page.waitForTimeout(200);
            }
        }

        expect(titleCount).toBeGreaterThan(0);
        await expect(page.getByTestId('table-row').filter({ hasText: originalTitle })).toHaveCount(
            0
        );
    });

    test('delete objective with confirmation', { tag: ['@REQ-NF-025'] }, async ({ page }) => {
        const title = `Delete objective ${Date.now()}`;
        await openObjectivesPage(page);
        await createObjectiveFromModal(page, {
            title,
            target: '100',
        });

        const createdRow = objectiveRow(page, title);
        await expect(createdRow).toBeVisible({ timeout: 10000 });

        const deleteDialog = page.locator(
            '[data-slot="alert-dialog-content"], [role="alertdialog"]'
        );
        let deleteConfirmed = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await createdRow.getByTestId('objective-delete-button').click();
                await expect(deleteDialog).toBeVisible({ timeout: 5000 });
                const confirmButton = deleteDialog.getByTestId('delete-confirm-button');
                await confirmButton.click();
                await expect(deleteDialog).toBeHidden({ timeout: 10000 });
                deleteConfirmed = true;
                break;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
            }
        }

        if (!deleteConfirmed) {
            throw new Error('Could not confirm objective deletion');
        }

        let titleCount = -1;
        const maxTime = Date.now() + 15000;

        while (Date.now() < maxTime && titleCount !== 0) {
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            titleCount = await page.getByText(title).count();

            if (titleCount !== 0) {
                await page.waitForTimeout(500);
            }
        }

        expect(titleCount).toBe(0);
    });

    test('filter objectives by search text', { tag: ['@REQ-OBJETIVOS-002'] }, async ({ page }) => {
        const firstTitle = `Search Alpha ${Date.now()}`;
        const secondTitle = `Search Beta ${Date.now()}`;

        await openObjectivesPage(page);
        await createObjectiveFromModal(page, { title: firstTitle });
        await createObjectiveFromModal(page, { title: secondTitle });

        await expect(objectiveRow(page, firstTitle)).toBeVisible();
        await expect(objectiveRow(page, secondTitle)).toBeVisible();

        await page.getByTestId('objectives-search-input').fill('Alpha');

        await expect(objectiveRow(page, firstTitle)).toBeVisible();
        await expect(page.getByTestId('table-row').filter({ hasText: secondTitle })).toHaveCount(0);
    });
});
