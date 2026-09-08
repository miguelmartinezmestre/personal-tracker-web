import type { Page, BrowserContext } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import type {
    TestUserData,
    ObjectiveData,
    CategoryData,
    OrganizationData,
} from '../helpers/test-helpers';
import {
    createTestUser,
    createObjective,
    createCategory,
    createOrganization,
    ensureDefaultCategories,
    loginUser,
    logoutUser,
} from '../helpers/test-helpers';
import { attachPageDiagnostics } from '../helpers/page-diagnostics';

interface IsolatedSessionFixture {
    context: BrowserContext;
    page: Page;
    user: TestUserData;
}

export interface TestFixtures {
    authenticatedPage: Page;
    isolatedAuthenticatedPage: Page;
    adminPage: Page;
    testUser: TestUserData;
    isolatedTestUser: TestUserData;
    createUser: (options?: Parameters<typeof createTestUser>[1]) => Promise<TestUserData>;
    createObjectiveHelper: (
        options?: Parameters<typeof createObjective>[1]
    ) => Promise<ObjectiveData>;
    createCategoryHelper: (options?: Parameters<typeof createCategory>[1]) => Promise<CategoryData>;
    createOrganizationHelper: (
        options?: Parameters<typeof createOrganization>[1]
    ) => Promise<OrganizationData>;
    ensureCategories: () => Promise<void>;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => Promise<void>;
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

    adminPage: async ({ browser }, use) => {
        const adminContext = await browser.newContext({
            storageState: 'tests/.auth/admin-user.json',
        });
        const page = await adminContext.newPage();
        attachPageDiagnostics(page, 'admin-page');
        await use(page);
        await adminContext.close();
    },

    testUser: async ({ isolatedSession }, use) => {
        await use(isolatedSession.user);
    },

    isolatedTestUser: async ({ isolatedSession }, use) => {
        await use(isolatedSession.user);
    },

    createUser: async ({ page }, use) => {
        await use(async options => {
            return createTestUser(page, options);
        });
    },

    createObjectiveHelper: async ({ page }, use) => {
        await use(async options => {
            return createObjective(page, options);
        });
    },

    createCategoryHelper: async ({ page }, use) => {
        await use(async options => {
            return createCategory(page, options);
        });
    },

    createOrganizationHelper: async ({ page }, use) => {
        await use(async options => {
            return createOrganization(page, options);
        });
    },

    ensureCategories: async ({ page }, use) => {
        await use(async () => {
            await ensureDefaultCategories(page);
        });
    },

    login: async ({ page }, use) => {
        await use(async (email, password) => {
            await loginUser(page, email, password);
        });
    },

    logout: async ({ page }, use) => {
        await use(async () => {
            await logoutUser(page);
        });
    },
});

export { expect };

export {
    createTestUser,
    createObjective,
    createCategory,
    createOrganization,
    ensureDefaultCategories,
    loginUser,
    logoutUser,
};
