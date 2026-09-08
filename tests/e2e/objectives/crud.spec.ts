import type { Locator, Page } from '@playwright/test';
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

        await originalRow.getByTestId('objective-edit-open').click();
        await expect(page.getByTestId('objective-edit-title-input')).toBeVisible();

        const editTitleInput = page.getByTestId('objective-edit-title-input');
        await editTitleInput.clear();
        await editTitleInput.fill(updatedTitle);
        await expect(editTitleInput).toHaveValue(updatedTitle);

        await saveEditedObjectiveAndWaitForRow(page, editTitleInput, updatedTitle);
        await expect(objectiveRow(page, originalTitle)).toHaveCount(0);
    });

    test('delete objective with confirmation', { tag: ['@REQ-NF-011'] }, async ({ page }) => {
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
        await createdRow.getByTestId('objective-delete-button').click();
        await expect(deleteDialog).toBeVisible();
        await deleteDialog.getByTestId('delete-confirm-button').click();
        await expect(deleteDialog).toBeHidden();
        await expect(objectiveRow(page, title)).toHaveCount(0);
        await expect(
            page
                .locator('section[aria-labelledby="objective-trash-heading"]')
                .getByText(title, { exact: true })
        ).toBeVisible();
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
