import { test as base, expect } from '@playwright/test';
import { ensureAuthenticatedState } from '../helpers/test-helpers';
import { attachPageDiagnostics } from '../helpers/page-diagnostics';

export const test = base.extend({
    context: async ({ browser }, use) => {
        const context = await browser.newContext({
            storageState: 'tests/.auth/admin-user.json',
        });
        const setupPage = await context.newPage();
        attachPageDiagnostics(setupPage, 'admin-setup');
        await ensureAuthenticatedState(setupPage);
        await setupPage.close();
        await use(context);
        await context.close();
    },

    page: async ({ context }, use) => {
        const page = await context.newPage();
        attachPageDiagnostics(page, 'admin-page');
        await ensureAuthenticatedState(page);
        await use(page);
    },
});

export { expect };
