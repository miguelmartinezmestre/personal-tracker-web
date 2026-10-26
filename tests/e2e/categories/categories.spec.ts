import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createCategory } from '../../helpers/categories';
import { UserFactory } from '../../helpers/factories';

test.describe('Categories', () => {
    test(
        'members create and edit categories, which can not be deleted while an objective uses them',
        {
            tag: [
                '@REQ-CATEGORIAS-001',
                '@REQ-CATEGORIAS-003',
                '@REQ-OBJETIVOS-004',
                '@INH-CAT-01',
                '@INH-CAT-02',
            ],
        },
        async ({ page }) => {
            const suffix = randomUUID().substring(0, 8);
            const name = `Reading ${suffix}`;
            const renamed = `Books ${suffix}`;

            await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('categories-empty')).toBeVisible({ timeout: 15000 });
            await createCategory(page, name);

            const row = page.getByTestId('category-row').filter({ hasText: name });
            await row.getByTestId('category-edit-button').click();
            await page.getByTestId('category-name-input').fill(renamed);
            await page.getByTestId('category-save-button').click();

            const renamedRow = page.getByTestId('category-row').filter({ hasText: renamed });
            await expect(renamedRow).toBeVisible({ timeout: 15000 });

            const title = `Read ${suffix}`;
            await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('objective-create-open').click();
            await page.getByTestId('objective-title-input').fill(title);
            await page.getByTestId('objective-target-input').fill('12');
            await page.getByTestId('objective-category-select').click();
            await page.getByRole('option', { name: renamed }).click();
            await page.getByTestId('objective-save-button').click();
            await expect(
                page.getByTestId('objective-row-link').filter({ hasText: title })
            ).toBeVisible({
                timeout: 15000,
            });

            await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            await renamedRow.getByTestId('category-delete-button').click();
            await page.getByTestId('delete-confirm-button').click();
            await expect(page.getByText(/still used by some objective/i)).toBeVisible({
                timeout: 15000,
            });
            await expect(renamedRow).toBeVisible();
        }
    );

    test(
        'signing up and creating an organization start from the platform catalog',
        { tag: ['@REQ-CATEGORIAS-002'] },
        async ({ browser, page }) => {
            const suffix = randomUUID().substring(0, 8);
            const signUpContext = await browser.newContext();

            try {
                const newcomer = await signUpContext.newPage();
                const user = UserFactory.create();
                await newcomer.goto('/register', { waitUntil: 'domcontentloaded' });
                await newcomer.getByTestId('register-username-input').fill(user.username);
                await newcomer.getByTestId('register-email-input').fill(user.email);
                await newcomer.getByTestId('register-password-input').fill(user.password);
                await newcomer.getByTestId('register-confirm-password-input').fill(user.password);
                await newcomer.getByTestId('register-button').click();

                const firstName = newcomer.getByTestId('category-draft-name-0');
                await expect(firstName).toHaveValue('Career', { timeout: 30000 });
                await newcomer.getByTestId('category-draft-remove-0').click();
                await newcomer.getByTestId('category-draft-new-name').fill(`Chess ${suffix}`);
                await newcomer.getByTestId('category-draft-add').click();
                await newcomer.getByTestId('register-categories-save').click();
                await expect(newcomer).toHaveURL(/\/dashboard\/home(\?|$)/, { timeout: 20000 });

                await newcomer.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
                const rows = newcomer.getByTestId('category-row');
                await expect(rows.filter({ hasText: `Chess ${suffix}` })).toBeVisible({
                    timeout: 15000,
                });
                await expect(rows.filter({ hasText: 'Health' })).toBeVisible();
                await expect(rows.filter({ hasText: 'Career' })).toHaveCount(0);
            } finally {
                await signUpContext.close();
            }

            await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
            await page.getByTestId('organization-create-open').click();
            await page.getByTestId('organization-name-input').fill(`Club ${suffix}`);
            await expect(page.getByTestId('category-draft-name-0')).toHaveValue('Career');
            await page.getByTestId('organization-save-button').click();
            await expect(page.getByTestId('organization-switcher')).toContainText(
                `Club ${suffix}`,
                {
                    timeout: 15000,
                }
            );

            await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
            await expect(
                page.getByTestId('category-row').filter({ hasText: 'Career' })
            ).toBeVisible({
                timeout: 15000,
            });
        }
    );
});
