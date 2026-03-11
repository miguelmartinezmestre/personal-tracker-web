import { test as base, Page, BrowserContext, expect } from '@playwright/test';
import {
    DEFAULT_PASSWORD,
    createTestUserViaAPI,
    createObjective,
    createCategory,
    createOrganization,
    createNotification,
    ensureDefaultCategories,
    setupPlatformAsAdmin,
    loginUser,
    logoutUser,
    TestUserData,
    ObjectiveData,
    CategoryData,
    OrganizationData,
    NotificationData,
} from '../helpers/test-helpers';

interface SessionUserPayload {
    user?: {
        email?: string | null;
        name?: string | null;
    } | null;
    session?: {
        activeOrganizationId?: string | null;
    } | null;
    data?: {
        user?: {
            email?: string | null;
            name?: string | null;
        } | null;
        session?: {
            activeOrganizationId?: string | null;
        } | null;
    } | null;
}

interface IsolatedSessionFixture {
    context: BrowserContext;
    page: Page;
    user: TestUserData;
}

async function loadAuthenticatedUser(page: Page): Promise<TestUserData> {
    const response = await page.request.get('/api/auth/get-session');

    if (!response.ok()) {
        throw new Error(`Failed to load authenticated session (${response.status()})`);
    }

    const payload = (await response.json()) as SessionUserPayload | null;
    const data = payload?.data ?? payload;
    const email = data?.user?.email ?? undefined;
    const username = data?.user?.name ?? undefined;

    if (!email || !username) {
        throw new Error('Authenticated session did not expose user email and name');
    }

    return {
        email,
        username,
        password: DEFAULT_PASSWORD,
        organizationSlug: data?.session?.activeOrganizationId ?? 'shared-org',
    };
}

/**
 * Extended test fixtures for comprehensive testing.
 */
export interface TestFixtures {
    /** Page with authenticated user */
    authenticatedPage: Page;
    /** Page with a dedicated user created for the current test */
    isolatedAuthenticatedPage: Page;
    /** Page with admin user */
    adminPage: Page;
    /** Current test user data */
    testUser: TestUserData;
    /** Dedicated test user data matching isolatedAuthenticatedPage */
    isolatedTestUser: TestUserData;
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
    /** Internal fixture backing isolatedAuthenticatedPage + isolatedTestUser */
    isolatedSession: IsolatedSessionFixture;
}

/**
 * Extended test with comprehensive fixtures.
 */
export const test = base.extend<TestFixtures>({
    authenticatedPage: async ({ page }, use) => {
        await use(page);
    },

    isolatedSession: async ({ browser }, use) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const user = await createTestUserViaAPI(page);
        await use({ context, page, user });
        await context.close();
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

    testUser: async ({ authenticatedPage }, use) => {
        const userData = await loadAuthenticatedUser(authenticatedPage);
        await use(userData);
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
    setupPlatformAsAdmin,
    loginUser,
    logoutUser,
};
