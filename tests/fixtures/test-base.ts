import { test as base, Page, BrowserContext, expect } from '@playwright/test';
import {
    createTestUserViaAPI,
    createObjective,
    createCategory,
    createOrganization,
    createNotification,
    ensureDefaultCategories,
    ensureAuthenticatedState,
    setupPlatformAsAdmin,
    loginUser,
    logoutUser,
    TestUserData,
    ObjectiveData,
    CategoryData,
    OrganizationData,
    NotificationData,
} from '../helpers/test-helpers';

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
    createUser: (options?: Parameters<typeof createTestUserViaAPI>[1]) => Promise<TestUserData>;
    createObjectiveHelper: (
        options?: Parameters<typeof createObjective>[1]
    ) => Promise<ObjectiveData>;
    createCategoryHelper: (options?: Parameters<typeof createCategory>[1]) => Promise<CategoryData>;
    createOrganizationHelper: (
        options?: Parameters<typeof createOrganization>[1]
    ) => Promise<OrganizationData>;
    createNotificationHelper: (
        objectiveTitle: string,
        options?: Parameters<typeof createNotification>[2]
    ) => Promise<NotificationData>;
    ensureCategories: () => Promise<void>;
    makeAdmin: () => Promise<void>;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => Promise<void>;
    isolatedSession: IsolatedSessionFixture;
}

export const test = base.extend<TestFixtures>({
    isolatedSession: async ({ browser }, use) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const user = await createTestUserViaAPI(page);
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
            return createTestUserViaAPI(page, options);
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

    createNotificationHelper: async ({ page }, use) => {
        await use(async (objectiveTitle, options) => {
            return createNotification(page, objectiveTitle, options);
        });
    },

    ensureCategories: async ({ page }, use) => {
        await use(async () => {
            await ensureDefaultCategories(page);
        });
    },

    makeAdmin: async ({ page }, use) => {
        await use(async () => {
            await setupPlatformAsAdmin(page);
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
    createTestUserViaAPI,
    createObjective,
    createCategory,
    createOrganization,
    createNotification,
    ensureDefaultCategories,
    setupPlatformAsAdmin,
    loginUser,
    logoutUser,
};
