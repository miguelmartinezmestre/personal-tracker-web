import { test as base, Page, expect } from '@playwright/test';
import {
    createTestUserViaAPI,
    createObjective,
    createCategory,
    createOrganization,
    createNotification,
    ensureDefaultCategories,
    promoteToAdmin,
    setupPlatformAsAdmin,
    loginUser,
    logoutUser,
    TestUserData,
    ObjectiveData,
    CategoryData,
    OrganizationData,
    NotificationData,
} from '../helpers/test-helpers';

/**
 * Extended test fixtures for comprehensive testing.
 */
export interface TestFixtures {
    /** Page with authenticated user */
    authenticatedPage: Page;
    /** Page with admin user */
    adminPage: Page;
    /** Current test user data */
    testUser: TestUserData;
    /** Helper to create a new test user */
    createUser: (options?: Parameters<typeof createTestUserViaAPI>[1]) => Promise<TestUserData>;
    /** Helper to create an objective */
    createObjectiveHelper: (
        options?: Parameters<typeof createObjective>[1]
    ) => Promise<ObjectiveData>;
    /** Helper to create a category */
    createCategoryHelper: (options?: Parameters<typeof createCategory>[1]) => Promise<CategoryData>;
    /** Helper to create an organization */
    createOrganizationHelper: (
        options?: Parameters<typeof createOrganization>[1]
    ) => Promise<OrganizationData>;
    /** Helper to create a notification */
    createNotificationHelper: (
        objectiveTitle: string,
        options?: Parameters<typeof createNotification>[2]
    ) => Promise<NotificationData>;
    /** Helper to ensure default categories exist */
    ensureCategories: () => Promise<void>;
    /** Helper to promote user to admin */
    makeAdmin: () => Promise<void>;
    /** Helper to login */
    login: (email: string, password?: string) => Promise<void>;
    /** Helper to logout */
    logout: () => Promise<void>;
}

/**
 * Extended test with comprehensive fixtures.
 */
export const test = base.extend<TestFixtures>({
    authenticatedPage: async ({ page }, use) => {
        await createTestUserViaAPI(page);
        await use(page);
    },

    adminPage: async ({ page }, use) => {
        await createTestUserViaAPI(page);
        await promoteToAdmin(page);
        await use(page);
    },

    testUser: async ({ page }, use) => {
        const userData = await createTestUserViaAPI(page);
        await use(userData);
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
            await promoteToAdmin(page);
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

/**
 * Re-export helpers for direct usage.
 */
export {
    createTestUserViaAPI,
    createObjective,
    createCategory,
    createOrganization,
    createNotification,
    ensureDefaultCategories,
    promoteToAdmin,
    setupPlatformAsAdmin,
    loginUser,
    logoutUser,
};
