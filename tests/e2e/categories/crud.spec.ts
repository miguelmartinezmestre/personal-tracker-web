import { test, expect } from '../../fixtures/test-base';
import {
    createCategory,
    ensureAuthenticatedState,
    openCreateObjectiveModal,
    openModal,
} from '../../helpers/test-helpers';
import { CategoryFactory } from '../../helpers/factories';
import { Locator, Page } from '@playwright/test';
import {
    saveEditedItemAndWaitForRow,
    submitOpenDialogForm,
} from '../../helpers/save-and-wait-for-row';

test.describe('Categories CRUD', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await ensureAuthenticatedState(page);
    });

    async function saveCategoryAndWaitForRow(page: Page, name: string): Promise<void> {
        const saveButton = page.getByTestId('category-save-button');

        await expect(saveButton).toBeVisible({ timeout: 10000 });
        await expect(saveButton).toBeEnabled({ timeout: 10000 });
        await submitOpenDialogForm(page);

        await expect(page.getByTestId('category-name-input')).toBeHidden({ timeout: 10000 });
        await expect(page.getByTestId('table-row').filter({ hasText: name }).first()).toBeVisible({
            timeout: 15000,
        });
    }

    async function saveEditedCategoryAndWaitForRow(
        page: Page,
        nameInput: Locator,
        rowName: string
    ): Promise<void> {
        await saveEditedItemAndWaitForRow({
            page,
            saveButtonTestId: 'category-edit-save-button',
            dialogInput: nameInput,
            rowLocator: page.getByTestId('table-row').filter({ hasText: rowName }).first(),
            entityLabel: `category "${rowName}"`,
            prepareForRowCheck: async currentPage => {
                await currentPage.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            },
            onRetry: async currentPage => {
                await currentPage.keyboard.press('Escape').catch(() => undefined);
                await currentPage.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            },
        });
    }

    test(
        'create category with name and color',
        { tag: ['@REQ-CATEGORIAS-001'] },
        async ({ page }) => {
            const categoryData = CategoryFactory.create();

            await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            await openModal(page, 'category-create-open', 'category-name-input', {
                maxAttempts: 5,
                timeout: 10000,
            });

            await page.getByTestId('category-name-input').fill(categoryData.name);
            await page.getByTestId('category-color-select').click();
            await page.waitForSelector('[role="option"]', { timeout: 10000 });
            await page.getByTestId('category-color-#3b82f6').click();

            await saveCategoryAndWaitForRow(page, categoryData.name);
        }
    );

    test('edit category name and color', { tag: ['@REQ-CATEGORIAS-003'] }, async ({ page }) => {
        const category = await createCategory(page, { name: `Edit Name ${Date.now()}` });

        await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });

        const categoryRow = page
            .getByTestId('table-row')
            .filter({ hasText: category.name })
            .first();
        await expect(categoryRow).toBeVisible();
        await categoryRow.getByTestId('category-edit-open').click();

        const nameInput = page.getByTestId('category-edit-name-input');
        await expect(nameInput).toBeVisible({ timeout: 10000 });

        const newName = `Updated ${Date.now()}`;
        await nameInput.fill(newName);
        await nameInput.blur();

        const colorSelect = page.getByTestId('category-edit-color-select');
        await expect(colorSelect).toBeVisible({ timeout: 10000 });
        await colorSelect.click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.getByTestId('category-edit-color-#ef4444').click();

        await saveEditedCategoryAndWaitForRow(page, nameInput, newName);
    });

    test('delete category', { tag: ['@REQ-CATEGORIAS-003', '@REQ-NF-011'] }, async ({ page }) => {
        const category = await createCategory(page, { name: `Delete Cat ${Date.now()}` });

        await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });

        const categoryRow = page
            .getByTestId('table-row')
            .filter({ hasText: category.name })
            .first();
        await expect(categoryRow).toBeVisible();
        await categoryRow.getByTestId('category-delete-button').click();

        const confirmDialog = page.locator('[data-slot="alert-dialog-content"], [role="dialog"]');
        await expect(confirmDialog.first()).toBeVisible({ timeout: 5000 });
        await confirmDialog.getByTestId('delete-confirm-button').click();

        await expect
            .poll(
                async () => {
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    return page.getByText(category.name).count();
                },
                { timeout: 15000, intervals: [500, 1000] }
            )
            .toBe(0);
    });

    test('assign category to objective', { tag: ['@REQ-OBJETIVOS-004'] }, async ({ page }) => {
        const categoryName = `Objective Cat ${Date.now()}`;
        await createCategory(page, { name: categoryName });

        await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
        await openCreateObjectiveModal(page);

        const title = `Categorized Obj ${Date.now()}`;
        await page.getByTestId('objective-title-input').fill(title);
        await page.getByTestId('objective-description-input').fill('Test with category');

        await page.getByTestId('objective-category-select').click();
        const categoryOption = page
            .locator('[role="option"]:not([data-disabled]):not([aria-disabled="true"])')
            .filter({ hasText: categoryName })
            .first();
        await expect(categoryOption).toBeVisible({ timeout: 10000 });
        await categoryOption.click();

        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('units');
        await page.getByTestId('objective-save-button').click();

        await expect(page.getByTestId('table-row').filter({ hasText: title }).first()).toBeVisible({
            timeout: 10000,
        });
    });

    test('validate category name required', { tag: ['@REQ-CATEGORIAS-001'] }, async ({ page }) => {
        await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
        await openModal(page, 'category-create-open', 'category-name-input', {
            maxAttempts: 5,
            timeout: 10000,
        });

        await page.getByTestId('category-save-button').click();

        await expect(page.getByTestId('category-name-input')).toBeVisible();
        await expect(page.locator('text=/required|requerido|name/i').first()).toBeVisible();
    });
});
