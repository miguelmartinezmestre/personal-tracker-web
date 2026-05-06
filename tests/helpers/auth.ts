import type { Page } from '@playwright/test';
import { createTestUser, type TestUserData } from './test-helpers';

export async function loginUser(page: Page): Promise<TestUserData> {
    return createTestUser(page);
}
