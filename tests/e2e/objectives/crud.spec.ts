import { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test-base';
import { createCategory, openCreateObjectiveModal } from '../../helpers/test-helpers';
import { saveEditedItemAndWaitForRow } from '../../helpers/save-and-wait-for-row';

async function openObjectivesPage(page: Page): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
}

async function selectObjectiveCategory(page: Page): Promise<void> {
    await page.getByTestId('objective-category-select').click();

    const enabledCategoryOptions = page.locator(
        '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
    );
    await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 10_000 });

    const personalOption = enabledCategoryOptions.filter({ hasText: /personal/i }).first();
    if ((await personalOption.count()) > 0) {
        await personalOption.click();
        return;
    }

    await enabledCategoryOptions.first().click();
}

async function createObjectiveFromModal(
    page: Page,
    params: { title: string; target?: string; unit?: string }
): Promise<void> {
    await openCreateObjectiveModal(page);

    await page.getByTestId('objective-title-input').fill(params.title);

    await selectObjectiveCategory(page);
    await page.getByTestId('objective-target-input').fill(params.target ?? '100');
    await page.getByTestId('objective-unit-input').fill(params.unit ?? 'units');
    await page.getByTestId('objective-save-button').click();
}

function objectiveRow(page: Page, title: string) {
    return page.getByTestId('table-row').filter({ hasText: title }).first();
}

async function saveEditedObjectiveAndWaitForRow(
    page: Page,
    titleInput: Locator,
    rowTitle: string
): Promise<void> {
    await saveEditedItemAndWaitForRow({
        page,
        saveButtonTestId: 'objective-edit-save-button',
        dialogInput: titleInput,
        rowLocator: objectiveRow(page, rowTitle),
        entityLabel: `objective "${rowTitle}"`,
        onRetry: async currentPage => {
            await currentPage.keyboard.press('Escape').catch(() => undefined);
            await currentPage.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
        },
    });
}

test.describe('Objectives CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await createCategory(page, { name: `Obj Setup ${Date.now()}` });
    });

    test(
        'create objective with custom metrics',
        { tag: ['@REQ-OBJETIVOS-001', '@REQ-OBJETIVOS-004'] },
        async ({ page }) => {
            const title = `Custom metrics objective ${Date.now()}`;
            await openObjectivesPage(page);

            await createObjectiveFromModal(page, {
                title,
                target: '75',
                unit: 'tasks',
            });

            await expect(objectiveRow(page, title)).toBeVisible({ timeout: 10000 });
        }
    );

    test('edit objective title', { tag: ['@REQ-OBJETIVOS-003'] }, async ({ page }) => {
        const originalTitle = `Edit objective ${Date.now()}`;
        const updatedTitle = `Edited objective ${Date.now()}`;

        await openObjectivesPage(page);
        await createObjectiveFromModal(page, {
            title: originalTitle,
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

        const editTitleInput = page.getByTestId('objective-edit-title-input');
        await editTitleInput.clear();
        await editTitleInput.fill(updatedTitle);
        await expect(editTitleInput).toHaveValue(updatedTitle);

        await saveEditedObjectiveAndWaitForRow(page, editTitleInput, updatedTitle);
        await expect(objectiveRow(page, originalTitle)).toHaveCount(0);
    });

    test('delete objective with confirmation', { tag: ['@REQ-NF-012'] }, async ({ page }) => {
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

    test('filter objectives by search text', { tag: ['@REQ-OBJETIVOS-008'] }, async ({ page }) => {
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
