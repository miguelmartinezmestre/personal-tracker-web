import { test as base, Page } from '@playwright/test';
import { createTestUser, promoteToAdmin, TestUserData } from '../helpers/test-helpers';

/**
 * Extended test fixtures for authentication.
 */
export interface AuthFixtures {
    /** Page with a regular authenticated user */
    authenticatedPage: Page;
    /** Page with an admin user */
    adminPage: Page;
    /** Data for the authenticated test user */
    testUser: TestUserData;
    /** Data for the admin test user */
    adminUser: TestUserData;
}

/**
 * Test with authentication fixtures.
 */
export const test = base.extend<AuthFixtures>({
    /**
     * Provides a page with an authenticated regular user.
     */
    authenticatedPage: async ({ page }, use) => {
        await createTestUser(page);
        await use(page);
    },

    /**
     * Provides a page with an authenticated admin user.
     */
    adminPage: async ({ page }, use) => {
        await createTestUser(page);
        await promoteToAdmin(page);
        await use(page);
    },

    /**
     * Provides test user data without automatically creating the user.
     * Useful when you need to control when user creation happens.
     */
    testUser: async ({ page }, use) => {
        const userData = await createTestUser(page);
        await use(userData);
    },

    /**
     * Provides admin user data.
     */
    adminUser: async ({ page }, use) => {
        const userData = await createTestUser(page);
        await promoteToAdmin(page);
        await use(userData);
    },
});

export { expect } from '@playwright/test';
