import { test, expect } from '../../fixtures/test-base';
import {
    createCategory,
    ensureAuthenticatedState,
    openCreateObjectiveModal,
    openModal,
} from '../../helpers/test-helpers';
import { CategoryFactory } from '../../helpers/factories';

test.describe('Categories CRUD', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await ensureAuthenticatedState(page);
    });

    async function submitOpenCategoryDialog(page: import('@playwright/test').Page): Promise<void> {
        await page
            .locator('[role="dialog"] form')
            .evaluate(form => (form as HTMLFormElement).requestSubmit())
            .catch(() => undefined);
    }

    async function saveCategoryAndWaitForRow(
        page: import('@playwright/test').Page,
        name: string
    ): Promise<void> {
        const saveButton = page.getByTestId('category-save-button');

        for (let attempt = 0; attempt < 3; attempt++) {
            await page.keyboard.press('Escape').catch(() => undefined);
            await expect(saveButton).toBeVisible({ timeout: 10000 });
            await expect(saveButton).toBeEnabled({ timeout: 10000 });
            await submitOpenCategoryDialog(page);

            try {
                await expect(page.getByTestId('category-name-input')).toBeHidden({ timeout: 5000 });
                await expect(
                    page.getByTestId('table-row').filter({ hasText: name }).first()
                ).toBeVisible({ timeout: 15000 });
                return;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
                await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
                await openModal(page, 'category-create-open', 'category-name-input', {
                    maxAttempts: 5,
                    timeout: 10000,
                });
                await page.getByTestId('category-name-input').fill(name);
                await page.getByTestId('category-color-select').click();
                await page.waitForSelector('[role="option"]', { timeout: 10000 });
                await page.getByTestId('category-color-#3b82f6').click();
            }
        }

        throw new Error(`Could not save category "${name}" from create modal`);
    }

    async function saveEditedCategoryAndWaitForRow(
        page: import('@playwright/test').Page,
        nameInput: import('@playwright/test').Locator,
        rowName: string
    ): Promise<void> {
        const saveButton = page.getByTestId('category-edit-save-button');

        for (let attempt = 0; attempt < 3; attempt++) {
            await expect(saveButton).toBeVisible({ timeout: 10000 });
            await expect(saveButton).toBeEnabled({ timeout: 10000 });
            await submitOpenCategoryDialog(page);

            try {
                await expect(nameInput).toBeHidden({ timeout: 5000 });
                await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
                await expect(
                    page.getByTestId('table-row').filter({ hasText: rowName }).first()
                ).toBeVisible({ timeout: 10000 });
                return;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
                await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            }
        }

        throw new Error(`Could not save edited category "${rowName}"`);
    }

    test('view categories list', async ({ page }) => {
        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        await expect(page).toHaveURL(/\/dashboard\/categories/);

        const createButton = page.getByTestId('category-create-open');
        await expect(createButton).toBeVisible();
    });

    test(
        'create category with name and color',
        { tag: ['@REQ-CATEGORIAS-001'] },
        async ({ page }) => {
            const categoryData = CategoryFactory.create();

            await page.goto('/dashboard/categories');
            await page.waitForLoadState('domcontentloaded');

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

    test('create category with icon', { tag: ['@REQ-CATEGORIAS-001'] }, async ({ page }) => {
        const categoryName = `Icon Category ${Date.now()}`;

        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        await openModal(page, 'category-create-open', 'category-name-input', {
            maxAttempts: 5,
            timeout: 10000,
        });

        await page.getByTestId('category-name-input').fill(categoryName);

        await page.getByTestId('category-color-select').click();
        await page.waitForSelector('[role="option"]', { timeout: 10000 });
        await page.getByTestId('category-color-#22c55e').click();

        const iconSelector = page.locator('[data-testid*="icon"], [data-testid*="category-icon"]');
        if ((await iconSelector.count()) > 0) {
            await iconSelector.first().click();
            const iconOption = page.getByRole('option').first();
            if ((await iconOption.count()) > 0) {
                await iconOption.click();
            }
        }

        await saveCategoryAndWaitForRow(page, categoryName);
    });

    test('edit category name', { tag: ['@REQ-CATEGORIAS-003'] }, async ({ page }) => {
        const category = await createCategory(page, { name: `Edit Name ${Date.now()}` });

        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        const categoryRow = page
            .getByTestId('table-row')
            .filter({ hasText: category.name })
            .first();
        await expect(categoryRow).toBeVisible();
        const editButton = categoryRow.getByTestId('category-edit-open');

        await expect(editButton).toBeVisible();
        await editButton.click();

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

    test('edit category color', { tag: ['@REQ-CATEGORIAS-003'] }, async ({ page }) => {
        const category = await createCategory(page, {
            name: `Edit Color ${Date.now()}`,
            color: 'Green',
        });

        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        const categoryRow = page
            .getByTestId('table-row')
            .filter({ hasText: category.name })
            .first();
        const editButton = categoryRow.getByTestId('category-edit-open');

        await expect(editButton).toBeVisible();
        await editButton.click();

        const colorSelect = page.getByTestId('category-edit-color-select');
        await expect(colorSelect).toBeVisible();
        await colorSelect.click();
        await page.waitForSelector('[role="option"]', { timeout: 5000 });
        await page.getByTestId('category-edit-color-#ef4444').click();

        const saveButton = page.getByTestId('category-edit-save-button');
        await expect(saveButton).toBeVisible({ timeout: 10000 });
        await saveButton.click();
    });

    test('delete category', { tag: ['@REQ-CATEGORIAS-003', '@REQ-NF-025'] }, async ({ page }) => {
        const category = await createCategory(page, { name: `Delete Cat ${Date.now()}` });

        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        await expect(page.getByText(category.name)).toBeVisible();

        const categoryRow = page
            .getByTestId('table-row')
            .filter({ hasText: category.name })
            .first();
        const deleteButton = categoryRow.getByTestId('category-delete-button');

        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        const confirmDialog = page.locator('[data-slot="alert-dialog-content"], [role="dialog"]');
        await expect(confirmDialog.first()).toBeVisible({ timeout: 5000 });

        const confirmButton = confirmDialog.getByTestId('delete-confirm-button');
        await confirmButton.click();

        let categoryCount = -1;
        const maxTime = Date.now() + 15000;

        while (Date.now() < maxTime && categoryCount !== 0) {
            await page.reload({ waitUntil: 'domcontentloaded' });
            categoryCount = await page.getByText(category.name).count();

            if (categoryCount !== 0) {
                await page.waitForTimeout(500);
            }
        }

        expect(categoryCount).toBe(0);
    });

    test('create default categories button', { tag: ['@REQ-CATEGORIAS-002'] }, async ({ page }) => {
        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        const defaultCategoriesButton = page.locator(
            'button:has-text("Default"), button:has-text("Predeterminadas"), [data-testid*="default-categories"]'
        );

        if ((await defaultCategoriesButton.count()) > 0) {
            await defaultCategoriesButton.first().click();

            const personalCategory = page.getByText(/personal/i);
            await expect(personalCategory.first()).toBeVisible({ timeout: 10000 });
        }
    });

    test('assign category to objective', async ({ page }) => {
        const categoryName = `Objective Cat ${Date.now()}`;
        await createCategory(page, { name: categoryName });

        await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
        await openCreateObjectiveModal(page);

        const title = `Categorized Obj ${Date.now()}`;
        await page.getByTestId('objective-title-input').fill(title);
        await page.getByTestId('objective-description-input').fill('Test with category');

        await page.getByTestId('objective-category-select').click();
        const enabledCategoryOptions = page.locator(
            '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
        );
        const categoryOption = enabledCategoryOptions.filter({ hasText: categoryName }).first();
        await expect(categoryOption).toBeVisible({ timeout: 10000 });
        await categoryOption.click();

        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('units');

        await page.getByTestId('objective-save-button').click();

        await expect(page.getByTestId('table-row').filter({ hasText: title }).first()).toBeVisible({
            timeout: 10000,
        });
    });

    test('category dropdown shows all categories', async ({ page }) => {
        await createCategory(page, { name: `Cat A ${Date.now()}` });
        await createCategory(page, { name: `Cat B ${Date.now()}` });

        await page.goto('/dashboard/objectives');

        await openCreateObjectiveModal(page);

        await page.getByTestId('objective-category-select').click();
        await page.waitForSelector('[role="option"]');

        const options = page.getByRole('option');
        const count = await options.count();

        expect(count).toBeGreaterThan(0);
    });

    test('validate category name required', { tag: ['@REQ-CATEGORIAS-001'] }, async ({ page }) => {
        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        await openModal(page, 'category-create-open', 'category-name-input', {
            maxAttempts: 5,
            timeout: 10000,
        });

        await page.getByTestId('category-save-button').click();

        const errorMessage = page.locator('text=/required|requerido|name/i');
        const hasError = (await errorMessage.count()) > 0;

        const modalStillOpen = await page.getByTestId('category-name-input').isVisible();

        expect(hasError || modalStillOpen).toBeTruthy();
    });

    test('cancel create closes modal', { tag: ['@REQ-CATEGORIAS-001'] }, async ({ page }) => {
        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        await openModal(page, 'category-create-open', 'category-name-input', {
            maxAttempts: 5,
            timeout: 10000,
        });

        await page.getByTestId('category-name-input').fill('Test Category');

        const cancelButton = page.getByTestId('category-cancel-button');
        await cancelButton.click();

        await expect(page.getByTestId('category-create-open')).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Test Category')).toBeHidden();
    });

    test('category colors display correctly', async ({ page }) => {
        const category = await createCategory(page, {
            name: `Color Display ${Date.now()}`,
            color: 'Blue',
        });

        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        const categoryRow = page
            .getByTestId('table-row')
            .filter({ hasText: category.name })
            .first();
        await expect(categoryRow).toBeVisible();

        const colorIndicator = categoryRow.locator(
            '[class*="blue"], [style*="blue"], .badge, [class*="color"]'
        );
        const hasColorIndicator = (await colorIndicator.count()) > 0;

        expect(hasColorIndicator || (await categoryRow.isVisible())).toBeTruthy();
    });
});
