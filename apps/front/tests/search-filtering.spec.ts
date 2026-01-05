import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'crypto';

async function registerUser(page: Page, uuid: string) {
    await page.goto('/register');
    await page.getByTestId('register-username-input').fill(`usernametest-${uuid}`);
    await page.getByTestId('register-email-input').fill(`useremail-${uuid}@useremail.com`);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');
    await page.getByTestId('register-button').click();
    await expect(page).toHaveURL(/\/dashboard\/home$/);
}

async function createObjective(
    page: Page,
    title: string,
    statusLabel: RegExp,
    currentValue: string = '5'
) {
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(`desc-${title}`);
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: /personal/i }).click();
    await page.getByTestId('objective-target-input').fill('10');
    await page.getByTestId('objective-unit-input').fill('units');
    await page.getByTestId('objective-current-input').fill(currentValue);

    await page.getByTestId('objective-status-select').click();
    await page.getByRole('option', { name: statusLabel }).click();

    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
}

test('search and filtering: global search filters objectives', async ({ page }) => {
    const uuid = randomUUID();
    await registerUser(page, uuid);

    await page.goto('/dashboard/objectives');

    const firstObjective = `aaa-${uuid}`;
    const secondObjective = `zzz-${uuid}`;

    await createObjective(page, firstObjective, /completed|completad[oa]/i, '2');
    await createObjective(page, secondObjective, /not started|no iniciado|no empezad[oa]/i, '9');

    const searchInput = page.getByTestId('objectives-search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill(firstObjective);
    await expect(page.getByText(firstObjective)).toBeVisible();
    await expect(page.getByText(secondObjective)).not.toBeVisible();

    await searchInput.fill(secondObjective);
    await expect(page.getByText(secondObjective)).toBeVisible();
    await expect(page.getByText(firstObjective)).not.toBeVisible();

    await searchInput.clear();
    await expect(page.getByText(firstObjective)).toBeVisible();
    await expect(page.getByText(secondObjective)).toBeVisible();
});

test('search and filtering: status column filter narrows results', async ({ page }) => {
    const uuid = randomUUID();
    await registerUser(page, uuid);

    await page.goto('/dashboard/objectives');

    const completedObjective = `completed-${uuid}`;
    const pendingObjective = `pending-${uuid}`;

    await createObjective(page, completedObjective, /completed|completad[oa]/i, '7');
    await createObjective(page, pendingObjective, /not started|no iniciado|no empezad[oa]/i, '1');

    const statusFilter = page.getByTestId('objectives-status-filter');
    await statusFilter.click();
    await page.getByTestId('objectives-status-completed').click();

    await expect(page.getByText(completedObjective)).toBeVisible();
    await expect(page.getByText(pendingObjective)).not.toBeVisible();
});

test('search and filtering: table sorting by title and progress', async ({ page }) => {
    const uuid = randomUUID();
    await registerUser(page, uuid);

    await page.goto('/dashboard/objectives');

    const firstObjective = `aaa-${uuid}`;
    const secondObjective = `zzz-${uuid}`;

    await createObjective(page, firstObjective, /completed|completad[oa]/i, '1');
    await createObjective(page, secondObjective, /not started|no iniciado|no empezad[oa]/i, '9');

    const titleSort = page.getByTestId('table-sort-title');
    await titleSort.click();

    const firstRow = page.locator('tr', { hasText: firstObjective }).first();
    const secondRow = page.locator('tr', { hasText: secondObjective }).first();

    const firstBox = await firstRow.boundingBox();
    const secondBox = await secondRow.boundingBox();
    if (firstBox && secondBox) {
        expect(firstBox.y).toBeLessThan(secondBox.y);
    }

    const progressSort = page.getByTestId('table-sort-progress');
    await progressSort.click();
    await progressSort.click();

    const firstAfterSort = await firstRow.boundingBox();
    const secondAfterSort = await secondRow.boundingBox();
    if (firstAfterSort && secondAfterSort) {
        expect(secondAfterSort.y).toBeLessThan(firstAfterSort.y);
    }
});
