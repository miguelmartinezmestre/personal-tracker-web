import { test, expect } from '@playwright/test';
import { createTestUserViaAPI, ensureDefaultCategories } from '../../helpers/test-helpers';

const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    "'–><script>alert(0)</script>",
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<details open ontoggle=alert("XSS")>',
];

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

        await page.getByTestId('objective-category-select').click();
        const enabledCategoryOptions = page.locator(
            '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
        );
        await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 10000 });
        await enabledCategoryOptions.first().click();

        await page.getByTestId('objective-save-button').click();

        await expect(
            page
                .getByTestId('table-row')
                .filter({ hasText: /Test.*Objective/ })
                .first()
        ).toBeVisible({ timeout: 10000 });

        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');

        const titleCell = page
            .getByTestId('table-row')
            .filter({ hasText: /Test.*Objective/ })
            .first()
            .locator('td')
            .first();
        const displayedTitle = await titleCell.textContent();

        expect(displayedTitle).not.toContain('<script>');
        expect(displayedTitle).not.toContain('</script>');
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

        await page.getByTestId('objective-category-select').click();
        const enabledCategoryOptions = page.locator(
            '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
        );
        await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 10000 });
        await enabledCategoryOptions.first().click();

        await page.getByTestId('objective-save-button').click();

        await expect(
            page
                .getByTestId('table-row')
                .filter({ hasText: /Test.*Objective/ })
                .first()
        ).toBeVisible({ timeout: 10000 });

        const pageContent = await page.content();
        expect(pageContent).not.toContain('onerror=alert');
        expect(pageContent).not.toContain('onerror="alert');
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

        await page.getByTestId('objective-category-select').click();
        const enabledCategoryOptions = page.locator(
            '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
        );
        await expect(enabledCategoryOptions.first()).toBeVisible({ timeout: 10000 });
        await enabledCategoryOptions.first().click();

        await page.getByTestId('objective-save-button').click();

        await expect(
            page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first()
        ).toBeVisible({ timeout: 10000 });

        await page
            .getByTestId('table-row')
            .filter({ hasText: objectiveTitle })
            .first()
            .getByTestId('objective-detail-link')
            .click();

        await page.waitForLoadState('domcontentloaded');

        await page.getByTestId('progress-update-open').click();
        await page.waitForSelector('[data-testid="progress-value-input"]', { timeout: 10000 });

        await page.getByTestId('progress-value-input').fill('50');

        const maliciousComment = 'Progress <script>alert("XSS")</script> update';
        const commentInput = page
            .locator('textarea, [data-testid="progress-comment-input"]')
            .first();
        if (await commentInput.isVisible().catch(() => false)) {
            await commentInput.fill(maliciousComment);
        }

        await page.getByTestId('progress-save-button').click();

        await page.waitForTimeout(1000);

        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
    });
});

test.describe('XSS Prevention - URL Parameters', () => {
    test('should sanitize malicious URL parameters', async ({ page }) => {
        await createTestUserViaAPI(page);

        const maliciousUrl = '/dashboard/home?message=<script>alert("XSS")</script>';
        await page.goto(maliciousUrl);
        await page.waitForLoadState('domcontentloaded');

        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
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

        const colorOptions = page.locator('[data-testid^="category-color-"]').first();
        if (await colorOptions.isVisible().catch(() => false)) {
            await colorOptions.click();
        }

        await page.getByTestId('category-save-button').click();

        await page.waitForTimeout(1000);

        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
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

        const pageContent = await page2.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');

        await context.close();
    });
});

test.describe('XSS Prevention - DOM-based XSS', () => {
    test('should prevent DOM-based XSS through hash fragments', async ({ page }) => {
        await createTestUserViaAPI(page);

        await page.goto('/dashboard/home#<script>alert("XSS")</script>');
        await page.waitForLoadState('domcontentloaded');

        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
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

            await page.waitForTimeout(500);

            const pageContent = await page.content();
            expect(pageContent).not.toContain('<script>alert("XSS")</script>');
        }
    });
});
