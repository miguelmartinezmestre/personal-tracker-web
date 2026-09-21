import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
export const DEFAULT_PASSWORD = 'Password123';
const DASHBOARD_HOME_RE = /\/dashboard\/home(\?|$)/;
function normalizeForEmail(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
}
interface CreateTestUserOptions {
    password?: string;
    usePresentableName?: boolean;
    customUsername?: string;
    customEmail?: string;
}
export interface TestUserData {
    username: string;
    email: string;
    password: string;
}
export function generateTestUserData(options?: CreateTestUserOptions): TestUserData {
    const uuid = randomUUID();
    const shortId = uuid.substring(0, 8);
    let username: string;
    let email: string;
    if (options?.customUsername) {
        username = options.customUsername;
        email = options.customEmail ?? `${normalizeForEmail(options.customUsername)}@example.com`;
    } else if (options?.usePresentableName) {
        const presentableNames = ['Miguel GarcÃ­a', 'Ana MartÃ­nez', 'Carlos LÃ³pez'];
        const presentableName =
            presentableNames[shortId.charCodeAt(0) % presentableNames.length] ?? 'Test User';
        username = presentableName;
        email = `${normalizeForEmail(presentableName)}.${shortId}@example.com`;
    } else {
        username = `testuser-${shortId}`;
        email = `testuser-${shortId}@test.com`;
    }
    return {
        username,
        email,
        password: options?.password ?? DEFAULT_PASSWORD,
    };
}
export async function hasOrganizationSelectedInUI(page: Page): Promise<boolean> {
    const switcher = page.getByTestId('organization-switcher');
    if ((await switcher.count()) === 0) {
        return false;
    }
    const label = (
        (await switcher
            .first()
            .textContent({ timeout: 2000 })
            .catch(() => null)) ?? ''
    )
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (!label.trim()) {
        return false;
    }
    return !label.includes('no organization') && !label.includes('sin organizacion');
}
async function waitForAuthenticatedDashboard(page: Page, timeout = 15000): Promise<void> {
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(DASHBOARD_HOME_RE, { timeout });
    await expect(page.getByRole('main')).toBeVisible({ timeout });
}
async function ensureActiveOrganization(page: Page, timeout = 12000): Promise<void> {
    await expect.poll(() => hasOrganizationSelectedInUI(page), { timeout }).toBe(true);
}
export async function ensureAuthenticatedState(page: Page): Promise<void> {
    await waitForAuthenticatedDashboard(page);
    await ensureActiveOrganization(page);
}
async function loginWithCredentials(page: Page, email: string, password: string): Promise<void> {
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForURL(DASHBOARD_HOME_RE, { timeout: 30000 });
    await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
    await ensureActiveOrganization(page);
}
async function signInViaApi(page: Page, userData: TestUserData): Promise<void> {
    const result = await page.evaluate(async user => {
        const response = await fetch('/api/auth/sign-in/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: user.email,
                password: user.password,
            }),
        });
        return { ok: response.ok, status: response.status, body: await response.text() };
    }, userData);
    expect(result.ok, `sign-in/email failed with HTTP ${result.status}: ${result.body}`).toBe(true);
}
async function createTestUserViaApi(page: Page, userData: TestUserData): Promise<void> {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(async user => {
        const response = await fetch('/api/auth/sign-up/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: user.username,
                email: user.email,
                password: user.password,
            }),
        });
        return { ok: response.ok, status: response.status, body: await response.text() };
    }, userData);
    expect(result.ok, `sign-up/email failed with HTTP ${result.status}: ${result.body}`).toBe(true);

    await waitForAuthenticatedDashboard(page);
    if (!DASHBOARD_HOME_RE.test(page.url())) {
        await signInViaApi(page, userData);
        await waitForAuthenticatedDashboard(page);
    }
    await ensureActiveOrganization(page);
}
export async function createTestUser(
    page: Page,
    options?: CreateTestUserOptions
): Promise<TestUserData> {
    const userData = generateTestUserData(options);
    await createTestUserViaApi(page, userData);
    return userData;
}
export async function loginUser(
    page: Page,
    email: string,
    password: string = DEFAULT_PASSWORD
): Promise<void> {
    await page.goto('/login');
    await loginWithCredentials(page, email, password);
    if (!DASHBOARD_HOME_RE.test(page.url())) {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(DASHBOARD_HOME_RE);
}
export async function logoutUser(page: Page): Promise<void> {
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    if (/\/login(\?|$)/.test(page.url())) {
        return;
    }
    const logoutButton = page.getByTestId('logout-button');
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15000 });
}
interface CreateOrganizationOptions {
    name?: string;
    description?: string;
}
interface OrganizationData {
    name: string;
}
export async function createOrganization(
    page: Page,
    options?: CreateOrganizationOptions
): Promise<OrganizationData> {
    const uuid = randomUUID();
    const name = options?.name ?? `test-org-${uuid.substring(0, 8)}`;
    const description = options?.description ?? 'Test organization description';
    await page.goto('/dashboard/organizations');
    await page.waitForURL(/\/dashboard\/organizations(\?|$)/, { timeout: 15000 });
    await page.waitForSelector('[data-testid="organizations-title"]', { timeout: 15000 });
    await page.getByTestId('organization-create-open').click();
    await page.waitForSelector('[data-testid="organization-name-input"]', { timeout: 5000 });
    await page.getByTestId('organization-name-input').fill(name);
    await page.getByTestId('organization-description-input').fill(description);
    await page.getByTestId('organization-save-button').click();
    await expect(page.getByTestId('organization-name-input')).toBeHidden({ timeout: 20000 });
    await expect(page.getByTestId('table-row').filter({ hasText: name }).first()).toBeVisible({
        timeout: 20000,
    });
    return { name };
}
