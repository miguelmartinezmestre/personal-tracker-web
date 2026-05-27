import { test, expect, type Page } from '@playwright/test';
import { createTestUserViaAPI, ensureDefaultCategories } from '../../helpers/test-helpers';

async function assertNoXssExecution(page: Page): Promise<void> {
    let dialogShown = false;
    page.once('dialog', async dialog => {
        dialogShown = true;
        await dialog.dismiss();
    });

    await page.waitForTimeout(500);
    expect(dialogShown).toBe(false);
}

async function assertNoDangerousDomNodes(page: Page): Promise<void> {
    expect(await page.locator('[onerror]').count()).toBe(0);
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(
        await page
            .locator('script:not([src])')
            .filter({ hasText: /alert\s*\(\s*["']XSS["']\s*\)/i })
            .count()
    ).toBe(0);
}

async function selectFirstEnabledCategory(page: Page): Promise<void> {
    await page.getByTestId('objective-category-select').click();
    const enabledCategoryOptions = page.locator(
        '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
    );
    await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 10000 });
    await enabledCategoryOptions.first().click();
}

async function openObjectiveDetailFromList(
    page: Page,
    objectiveTitle: string
): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

    const rowWithProgressLink = page
        .getByTestId('table-row')
        .filter({ hasText: objectiveTitle })
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

test.describe('XSS Prevention - Objective Titles', () => {
    test('should sanitize script tags in objective titles', async ({ page }) => {
        await createTestUserViaAPI(page);
        await ensureDefaultCategories(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        await page.getByTestId('objective-create-open').click();
        await page.waitForSelector('[data-testid="objective-title-input"]', { timeout: 10000 });

        const maliciousTitle = 'Test <script>alert("XSS")</script> Objective';
        await page.getByTestId('objective-title-input').fill(maliciousTitle);
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('units');

        await selectFirstEnabledCategory(page);
        await page.getByTestId('objective-save-button').click();

        const titleRow = page
            .getByTestId('table-row')
            .filter({ hasText: /Test.*Objective/ })
            .first();
        await expect(titleRow).toBeVisible({ timeout: 10000 });

        const titleCell = titleRow.locator('td').first();
        const titleCellHtml = await titleCell.innerHTML();
        expect(titleCellHtml).not.toMatch(/<script[\s>]/i);

        await assertNoDangerousDomNodes(page);
        await assertNoXssExecution(page);
    });

    test('should sanitize event handlers in objective titles', async ({ page }) => {
        await createTestUserViaAPI(page);
        await ensureDefaultCategories(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        await page.getByTestId('objective-create-open').click();
        await page.waitForSelector('[data-testid="objective-title-input"]', { timeout: 10000 });

        const maliciousTitle = 'Test <img src=x onerror=alert("XSS")> Objective';
        await page.getByTestId('objective-title-input').fill(maliciousTitle);
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('units');

        await selectFirstEnabledCategory(page);
        await page.getByTestId('objective-save-button').click();

        await expect(
            page
                .getByTestId('table-row')
                .filter({ hasText: /Test.*Objective/ })
                .first()
        ).toBeVisible({ timeout: 10000 });

        await assertNoDangerousDomNodes(page);
        await assertNoXssExecution(page);
    });
});

test.describe('XSS Prevention - Progress Comments', () => {
    test('should sanitize XSS in progress update comments', async ({ page }) => {
        await createTestUserViaAPI(page);
        await ensureDefaultCategories(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        await page.getByTestId('objective-create-open').click();
        await page.waitForSelector('[data-testid="objective-title-input"]', { timeout: 10000 });

        const objectiveTitle = `XSS Test Objective ${Date.now()}`;
        await page.getByTestId('objective-title-input').fill(objectiveTitle);
        await page.getByTestId('objective-target-input').fill('100');
        await page.getByTestId('objective-unit-input').fill('units');

        await selectFirstEnabledCategory(page);
        await page.getByTestId('objective-save-button').click();

        await expect(
            page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first()
        ).toBeVisible({ timeout: 10000 });

        await openObjectiveDetailFromList(page, objectiveTitle);

        await page.getByTestId('progress-create-open').click();
        await page.waitForSelector('[data-testid="progress-value-input"]', { timeout: 10000 });

        await page.getByTestId('progress-value-input').fill('50');

        const maliciousComment = 'Progress <script>alert("XSS")</script> update';
        await page.getByTestId('progress-comment-input').fill(maliciousComment);
        await page.getByTestId('progress-save-button').click();

        await expect(page.getByTestId('progress-value-input')).toHaveCount(0, { timeout: 10000 });

        await assertNoDangerousDomNodes(page);
        await assertNoXssExecution(page);
    });
});

test.describe('XSS Prevention - URL Parameters', () => {
    test('should sanitize malicious URL parameters', async ({ page }) => {
        await createTestUserViaAPI(page);

        const maliciousUrl = '/dashboard/home?message=<script>alert("XSS")</script>';
        await page.goto(maliciousUrl);
        await page.waitForLoadState('domcontentloaded');

        await assertNoDangerousDomNodes(page);
        await assertNoXssExecution(page);
    });

    test('should handle javascript protocol in links', async ({ page }) => {
        await createTestUserViaAPI(page);

        await page.goto('/dashboard/home');
        await page.waitForLoadState('domcontentloaded');

        const links = await page.locator('a[href^="javascript:"]').all();

        expect(links.length).toBe(0);
    });
});

test.describe('XSS Prevention - Stored XSS', () => {
    test('should prevent stored XSS through category names', async ({ page }) => {
        await createTestUserViaAPI(page);

        await page.goto('/dashboard/categories');
        await page.waitForLoadState('domcontentloaded');

        await page.getByTestId('category-create-open').click();
        await page.waitForSelector('[data-testid="category-name-input"]', { timeout: 10000 });

        const maliciousCategory = 'Test <script>alert("XSS")</script> Category';
        await page.getByTestId('category-name-input').fill(maliciousCategory);

        await page.getByTestId('category-save-button').click();

        await expect(
            page.getByTestId('table-row').filter({ hasText: 'Test' }).filter({ hasText: 'Category' }).first()
        ).toBeVisible({ timeout: 10000 });

        await assertNoDangerousDomNodes(page);
        await assertNoXssExecution(page);
    });

    test('should prevent XSS in organization names', async ({ page, browser }) => {
        const context = await browser.newContext();
        const page2 = await context.newPage();

        await createTestUserViaAPI(page2);

        await page2.goto('/dashboard/organizations');
        await page2.waitForLoadState('domcontentloaded');

        await page2.getByTestId('organization-create-open').click();
        await page2.waitForSelector('[data-testid="organization-name-input"]', { timeout: 10000 });

        const maliciousOrgName = 'Test <script>alert("XSS")</script> Org';
        await page2.getByTestId('organization-name-input').fill(maliciousOrgName);
        await page2.getByTestId('organization-description-input').fill('Test description');

        await page2.getByTestId('organization-save-button').click();

        await page2.waitForTimeout(1000);

        await assertNoDangerousDomNodes(page2);
        await assertNoXssExecution(page2);

        await context.close();
    });
});

test.describe('XSS Prevention - DOM-based XSS', () => {
    test('should prevent DOM-based XSS through hash fragments', async ({ page }) => {
        await createTestUserViaAPI(page);

        await page.goto('/dashboard/home#<script>alert("XSS")</script>');
        await page.waitForLoadState('domcontentloaded');

        await assertNoDangerousDomNodes(page);
        await assertNoXssExecution(page);
    });

    test('should safely handle user input in search fields', async ({ page }) => {
        await createTestUserViaAPI(page);

        await page.goto('/dashboard/objectives');
        await page.waitForLoadState('domcontentloaded');

        const searchInput = page
            .locator(
                'input[type="search"], input[placeholder*="search" i], [data-testid*="search"]'
            )
            .first();

        if (await searchInput.isVisible().catch(() => false)) {
            await searchInput.fill('<script>alert("XSS")</script>');
            await searchInput.press('Enter');

            await assertNoDangerousDomNodes(page);
            await assertNoXssExecution(page);
        }
    });
});
