import type { Page, BrowserContext } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { createTestUser, type TestUserData } from '../helpers/test-helpers';
import { attachPageDiagnostics } from '../helpers/page-diagnostics';

interface IsolatedSessionFixture {
    context: BrowserContext;
    page: Page;
    user: TestUserData;
}

interface TestFixtures {
    authenticatedPage: Page;
    isolatedAuthenticatedPage: Page;
    testUser: TestUserData;
    isolatedTestUser: TestUserData;
    isolatedSession: IsolatedSessionFixture;
}

export const test = base.extend<TestFixtures>({
    isolatedSession: async (
        {
            browser,
            contextOptions,
            viewport,
            isMobile,
            hasTouch,
            deviceScaleFactor,
            userAgent,
            locale,
            colorScheme,
            baseURL,
        },
        use
    ) => {
        const context = await browser.newContext({
            ...contextOptions,
            viewport,
            isMobile,
            hasTouch,
            deviceScaleFactor,
            userAgent,
            locale,
            colorScheme,
            baseURL,
        });
        const page = await context.newPage();
        attachPageDiagnostics(page, 'isolated-session');
        const user = await createTestUser(page);
        await use({ context, page, user });
        await context.close();
    },

    context: async ({ isolatedSession }, use) => {
        await use(isolatedSession.context);
    },

    page: async ({ isolatedSession }, use) => {
        await use(isolatedSession.page);
    },

    authenticatedPage: async ({ isolatedSession }, use) => {
        await use(isolatedSession.page);
    },

    isolatedAuthenticatedPage: async ({ isolatedSession }, use) => {
        await use(isolatedSession.page);
    },

    testUser: async ({ isolatedSession }, use) => {
        await use(isolatedSession.user);
    },

    isolatedTestUser: async ({ isolatedSession }, use) => {
        await use(isolatedSession.user);
    },
});

export { expect };
