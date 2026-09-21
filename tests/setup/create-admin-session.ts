import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, type Page } from '@playwright/test';
import {
    generateTestUserData,
    hasOrganizationSelectedInUI,
    type TestUserData,
} from '../helpers/test-helpers';

const ADMIN_USER_FILE = 'tests/.auth/admin-user.json';

async function fillSetupInput(
    page: Page,
    testId: string,
    value: string,
    options?: { untilNextEnabled?: boolean }
): Promise<void> {
    const input = page.getByTestId(testId);
    const nextButton = page.getByTestId('setup-next-button');
    await expect(input).toBeVisible();
    await expect(async () => {
        await input.click();
        await input.fill('');
        await input.fill(value);
        const committed = await input.inputValue();
        if (committed !== value) {
            await input.click();
            await input.fill('');
            await input.pressSequentially(value, { delay: 15 });
        }
        await input.blur();
        await expect(input).toHaveValue(value);
        if (options?.untilNextEnabled) {
            await expect(nextButton).toBeEnabled({ timeout: 1_000 });
        }
    }).toPass({ timeout: 15_000 });
}

async function clickSetupNext(page: Page): Promise<void> {
    const nextButton = page.getByTestId('setup-next-button');
    await expect(nextButton).toBeEnabled({ timeout: 10_000 });
    await nextButton.click();
}

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

    const setupSecret = process.env.SETUP_SECRET;
    if (setupSecret) {
        const unauthorizedSignUp = await page.request.post('/api/auth/sign-up/email', {
            data: {
                name: userData.username,
                email: userData.email,
                password: userData.password,
            },
        });
        expect(unauthorizedSignUp.status()).toBe(403);
    }

    await fillSetupInput(page, 'setup-platform-name', 'Metrics App', { untilNextEnabled: true });
    await clickSetupNext(page);

    await fillSetupInput(page, 'setup-username', userData.username);
    await fillSetupInput(page, 'setup-email', userData.email);
    await fillSetupInput(page, 'setup-password', userData.password);
    await fillSetupInput(page, 'setup-confirm-password', userData.password);
    if (setupSecret) {
        await fillSetupInput(page, 'setup-secret', setupSecret);
    }
    await clickSetupNext(page);

    await fillSetupInput(page, 'setup-org-name', 'Product Team', { untilNextEnabled: true });
    await clickSetupNext(page);

    await clickSetupNext(page);
    await page
        .getByTestId('setup-registration-policy')
        .getByRole('radio', { name: /open|abierta/i })
        .click();
    await expect(page.locator('#policy-open')).toBeChecked();
    await clickSetupNext(page);

    const completeButton = page.getByTestId('setup-complete-button');
    await expect(completeButton).toBeEnabled({ timeout: 10_000 });
    await completeButton.click();
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 30_000 });
}

export async function createAdminSession(page: Page): Promise<TestUserData> {
    const userData = generateTestUserData({ customUsername: 'Ana Martínez' });

    await completeSetupWizard(page, userData);
    await waitForAdminDashboardReady(page);
    await expect(page.getByTestId('dashboard-home-stub')).toBeVisible({
        timeout: 10_000,
    });

    await mkdir(dirname(ADMIN_USER_FILE), { recursive: true });
    await page.context().storageState({ path: ADMIN_USER_FILE });

    return userData;
}
