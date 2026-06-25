import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, type Page } from '@playwright/test';
import {
    generateTestUserData,
    hasOrganizationSelectedInUI,
    type TestUserData,
} from '../helpers/test-helpers';

const ADMIN_USER_FILE = 'tests/.auth/admin-user.json';

async function waitForAdminDashboardReady(page: Page): Promise<void> {
    await expect(async () => {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);
        await expect(page.getByTestId('organization-switcher')).toBeVisible();
        expect(await hasOrganizationSelectedInUI(page)).toBe(true);
    }).toPass({ timeout: 30_000 });
}

async function completeSetupWizard(page: Page, userData: TestUserData): Promise<void> {
    await page.goto('/setup', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('setup-platform-name').fill('Metrics App');
    await page.getByTestId('setup-next-button').click();

    await page.getByTestId('setup-username').fill(userData.username);
    await page.getByTestId('setup-email').fill(userData.email);
    await page.getByTestId('setup-password').fill(userData.password);
    await page.getByTestId('setup-confirm-password').fill(userData.password);
    await page.getByTestId('setup-next-button').click();

    await page.getByTestId('setup-org-name').fill('Product Team');
    await page.getByTestId('setup-next-button').click();

    await page.getByTestId('setup-next-button').click();
    await page.locator('#policy-open').click();
    await page.getByTestId('setup-next-button').click();

    await page.getByTestId('setup-complete-button').click();
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 30_000 });
}

export async function createAdminSession(page: Page): Promise<TestUserData> {
    const userData = generateTestUserData({ customUsername: 'Ana Martínez' });

    await completeSetupWizard(page, userData);
    await waitForAdminDashboardReady(page);
    await expect(page.locator('a[href*="/dashboard/admin"]').first()).toBeVisible({
        timeout: 10_000,
    });

    await mkdir(dirname(ADMIN_USER_FILE), { recursive: true });
    await page.context().storageState({ path: ADMIN_USER_FILE });

    return userData;
}
