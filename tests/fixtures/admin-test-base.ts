import { test as base, expect, type Page } from '@playwright/test';
import { ensureAuthenticatedState } from '../helpers/test-helpers';

interface AdminFixtures {
    adminPage: Page;
}

export const test = base.extend<AdminFixtures>({
    context: async ({ browser }, use) => {
        const context = await browser.newContext({
            storageState: 'tests/.auth/admin-user.json',
        });
        const setupPage = await context.newPage();
        await ensureAuthenticatedState(setupPage);
        await setupPage.close();
        await use(context);
        await context.close();
    },

    page: async ({ context }, use) => {
        const page = await context.newPage();
        await use(page);
    },

    adminPage: async ({ page }, use) => {
        await use(page);
    },
});

export { expect };
