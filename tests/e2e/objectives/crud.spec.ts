import { test, expect } from '@playwright/test';
import { createTestUser, ensureDefaultCategories } from '../../helpers/test-helpers';

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
            await page.waitForTimeout(250);
        }
    }

    if (!modalOpened) {
        throw new Error('Could not open create objective modal');
    }

    await page.getByTestId('objective-title-input').fill(params.title);

    if (params.scope === 'organization') {
        await page.getByTestId('objective-scope-select').click();
        const organizationScopeOption = page
            .getByRole('option')
            .filter({ hasText: /organization|organizaci/i })
            .first();
        await organizationScopeOption.click();
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
        await createTestUser(page);
        await ensureDefaultCategories(page);
    });

    test('create personal objective', async ({ page }) => {
        const title = `Personal objective ${Date.now()}`;
        await openObjectivesPage(page);

        await createObjectiveFromModal(page, {
            title,
            target: '120',
            unit: 'points',
        });

        await expect(objectiveRow(page, title)).toBeVisible({ timeout: 10000 });
    });

    test('create organization objective', async ({ page }) => {
        const title = `Organization objective ${Date.now()}`;
        await openObjectivesPage(page);

        await createObjectiveFromModal(page, {
            title,
            target: '75',
            unit: 'tasks',
            scope: 'organization',
        });

        await expect(objectiveRow(page, title)).toBeVisible({ timeout: 10000 });
    });

    test('edit objective title and scope', async ({ page }) => {
        const originalTitle = `Edit objective ${Date.now()}`;
        const updatedTitle = `Edited objective ${Date.now()}`;

        await openObjectivesPage(page);
        await createObjectiveFromModal(page, {
            title: originalTitle,
            scope: 'personal',
        });

        const originalRow = objectiveRow(page, originalTitle);
        await expect(originalRow).toBeVisible({ timeout: 10000 });
        await originalRow.getByTestId('objective-edit-open').click();
        await expect(page.getByTestId('objective-edit-title-input')).toBeVisible({
            timeout: 10000,
        });

        await page.getByTestId('objective-edit-title-input').clear();
        await page.getByTestId('objective-edit-title-input').fill(updatedTitle);

        let scopeChanged = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await page.getByTestId('objective-edit-scope-select').click();
                const organizationScopeOption = page
                    .getByRole('option')
                    .filter({ hasText: /organization|organizaci/i })
                    .first();
                await organizationScopeOption.click();
                scopeChanged = true;
                break;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
                await page.waitForTimeout(250);
            }
        }

        if (!scopeChanged) {
            throw new Error('Could not change objective scope in edit modal');
        }

        await page.getByTestId('objective-edit-save-button').click();
        await page.waitForURL(/\/dashboard\/objectives(\?|$)/, { timeout: 10000 });

        await expect(objectiveRow(page, updatedTitle)).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('table-row').filter({ hasText: originalTitle })).toHaveCount(
            0
        );
    });

    test('delete objective with confirmation', async ({ page }) => {
        const title = `Delete objective ${Date.now()}`;
        await openObjectivesPage(page);
        await createObjectiveFromModal(page, {
            title,
            target: '100',
        });

        const createdRow = objectiveRow(page, title);
        await expect(createdRow).toBeVisible({ timeout: 10000 });

        await createdRow.getByTestId('objective-delete-button').click();

        const deleteDialog = page.locator(
            '[data-slot="alert-dialog-content"], [role="alertdialog"]'
        );
        await expect(deleteDialog).toBeVisible({ timeout: 10000 });

        const confirmButton = deleteDialog.getByTestId('delete-confirm-button');

        // Click can race with dialog unmount; try a few times and
        // rely on the URL + table assertions below as the source of truth.
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await confirmButton.click();
                break;
            } catch {
                await page.waitForTimeout(250);
            }
        }

        await page.waitForURL(/\/dashboard\/objectives(\?|$)/, { timeout: 10000 });

        await expect(page.getByTestId('table-row').filter({ hasText: title })).toHaveCount(0);
    });

    test('filter objectives by search text', async ({ page }) => {
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
