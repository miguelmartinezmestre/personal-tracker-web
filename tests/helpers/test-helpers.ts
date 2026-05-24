import { Page, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export const DEFAULT_PASSWORD = 'Password123';

function normalizeForEmail(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
}

function normalizeForSlug(name: string): string {
    const normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return normalized.substring(0, 20);
}

function createSafeSlug(name: string, suffix: string): string {
    const normalized = normalizeForSlug(name);
    const maxBaseLength = 30 - 1 - suffix.length;
    const base = normalized.substring(0, Math.max(1, maxBaseLength));
    return `${base}-${suffix}`;
}

export interface CreateTestUserOptions {
    password?: string;
    usePresentableName?: boolean;
    customUsername?: string;
    customEmail?: string;
    customOrganizationSlug?: string;
}

export interface TestUserData {
    username: string;
    email: string;
    password: string;
    organizationSlug: string;
}

interface AuthSessionPayload {
    session?: {
        activeOrganizationId?: string | null;
    } | null;
    user?: unknown;
    data?: {
        session?: {
            activeOrganizationId?: string | null;
        } | null;
        user?: unknown;
    } | null;
}

interface OrganizationListItem {
    id?: string;
}

export function generateTestUserData(options?: CreateTestUserOptions): TestUserData {
    const uuid = randomUUID();
    const shortId = uuid.substring(0, 8);

    let username: string;
    let email: string;
    let organizationSlug: string;

    if (options?.customUsername) {
        username = options.customUsername;
        email = options?.customEmail ?? `${normalizeForEmail(options.customUsername)}@example.com`;
        organizationSlug =
            options?.customOrganizationSlug ?? createSafeSlug(options.customUsername, shortId);
    } else if (options?.usePresentableName) {
        const presentableNames = ['Miguel Garcia', 'Ana Martinez', 'Carlos Lopez'];
        const randomName =
            presentableNames[Math.floor(Math.random() * presentableNames.length)] ?? 'Test User';
        username = randomName;
        email = `${normalizeForEmail(randomName)}.${shortId}@example.com`;
        organizationSlug = createSafeSlug(randomName, shortId);
    } else {
        username = `testuser-${shortId}`;
        email = `testuser-${shortId}@test.com`;
        organizationSlug = `org-${shortId}`;
    }

    return {
        username,
        email,
        password: options?.password ?? DEFAULT_PASSWORD,
        organizationSlug,
    };
}

async function getSessionData(page: Page): Promise<AuthSessionPayload | null> {
    try {
        const response = await page.request.get('/api/auth/get-session');

        if (!response.ok()) {
            return null;
        }

        const payload = (await response.json()) as AuthSessionPayload | null;
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        return payload.data ?? payload;
    } catch {
        return null;
    }
}

async function hasAuthenticatedSession(page: Page): Promise<boolean> {
    const sessionData = await getSessionData(page);
    return Boolean(sessionData?.session && sessionData?.user);
}

async function hasActiveOrganization(page: Page): Promise<boolean> {
    const sessionData = await getSessionData(page);
    return Boolean(sessionData?.session?.activeOrganizationId);
}

async function hasOrganizationSelectedInUI(page: Page): Promise<boolean> {
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

async function getOrganizationIds(page: Page): Promise<string[]> {
    try {
        return await page.evaluate(async () => {
            const response = await fetch('/api/auth/organization/list', {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                return [];
            }

            const payload = (await response.json()) as
                | OrganizationListItem[]
                | { data?: unknown }
                | null;

            const organizations = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                  ? (payload.data as OrganizationListItem[])
                  : [];

            return organizations
                .map(organization => organization.id)
                .filter(
                    (organizationId): organizationId is string =>
                        typeof organizationId === 'string' && organizationId.length > 0
                );
        });
    } catch {
        return [];
    }
}

async function setActiveOrganizationViaBrowser(
    page: Page,
    organizationId: string
): Promise<boolean> {
    try {
        return await page.evaluate(async organizationIdArg => {
            const response = await fetch('/api/auth/organization/set-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ organizationId: organizationIdArg }),
            });

            return response.ok;
        }, organizationId);
    } catch {
        return false;
    }
}

async function setActiveOrganizationViaUi(page: Page): Promise<boolean> {
    const switcher = page.getByTestId('organization-switcher');
    if ((await switcher.count()) === 0) {
        return false;
    }

    const trigger = switcher.first();
    if (!(await trigger.isVisible()) || (await trigger.isDisabled())) {
        return false;
    }

    await trigger.click();

    const option = page.locator('[data-testid^="organization-option-"]').first();
    try {
        await expect(option).toBeVisible({ timeout: 5000 });
    } catch {
        await page.keyboard.press('Escape').catch(() => undefined);
        return false;
    }

    await option.click();
    await expect(option).toBeHidden({ timeout: 5000 });

    return true;
}

async function ensureOrganizationExists(page: Page): Promise<void> {
    try {
        await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-testid="organization-create-open"]', { timeout: 15000 });

        const existingOrganizations = await page.getByTestId('table-row').count();
        if (existingOrganizations > 0) {
            return;
        }

        const uniqueSuffix = randomUUID().substring(0, 8);
        const organizationName = `Test Org ${uniqueSuffix}`;

        let modalOpened = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            await page.getByTestId('organization-create-open').click();
            try {
                await page.waitForSelector('[data-testid="organization-name-input"]', {
                    timeout: 5000,
                });
                modalOpened = true;
                break;
            } catch {
                await page.keyboard.press('Escape').catch(() => undefined);
            }
        }

        if (!modalOpened) {
            return;
        }

        await page.getByTestId('organization-name-input').fill(organizationName);
        await page
            .getByTestId('organization-description-input')
            .fill('Automatically created for E2E setup');
        await page.getByTestId('organization-save-button').click();

        await expect(
            page.getByTestId('table-row').filter({ hasText: organizationName }).first()
        ).toBeVisible({
            timeout: 15000,
        });
    } catch {}
}

async function waitForAuthenticatedSession(page: Page, timeout = 15000): Promise<void> {
    await expect
        .poll(async () => await hasAuthenticatedSession(page), {
            timeout,
            intervals: [500, 1000, 2000],
        })
        .toBe(true);
}

async function ensureActiveOrganization(page: Page, timeout = 12000): Promise<void> {
    if ((await hasActiveOrganization(page)) && (await hasOrganizationSelectedInUI(page))) {
        return;
    }

    const timeoutAt = Date.now() + timeout;
    while (Date.now() < timeoutAt) {
        const organizationIds = await getOrganizationIds(page);
        for (const organizationId of organizationIds) {
            if (await setActiveOrganizationViaBrowser(page, organizationId)) {
                await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
                await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 10000 });
                if (await hasOrganizationSelectedInUI(page)) {
                    return;
                }
            }
        }

        if (await setActiveOrganizationViaUi(page)) {
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            if (await hasOrganizationSelectedInUI(page)) {
                return;
            }
        }

        await page
            .goto('/dashboard/home', { waitUntil: 'domcontentloaded' })
            .catch(() => undefined);
        if ((await hasActiveOrganization(page)) && (await hasOrganizationSelectedInUI(page))) {
            return;
        }
    }

    try {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    } catch {}
}

export async function ensureAuthenticatedState(page: Page): Promise<void> {
    await waitForAuthenticatedSession(page);
    let ensureOrganizationResponse: Awaited<ReturnType<typeof page.request.post>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        ensureOrganizationResponse = await page.request.post('/api/test/ensure-organization', {
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ createPersonalCategory: true }),
        });

        if (ensureOrganizationResponse.ok() || ensureOrganizationResponse.status() < 500) {
            break;
        }

        await page.waitForTimeout(1000);
    }

    if (!ensureOrganizationResponse) {
        throw new Error('Ensure organization API failed (0): No response');
    }

    if (!ensureOrganizationResponse.ok()) {
        const body = await ensureOrganizationResponse.text();
        throw new Error(
            `Ensure organization API failed (${ensureOrganizationResponse.status()}): ${body}`
        );
    }
    await ensureActiveOrganization(page);
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
}

async function loginWithCredentials(page: Page, email: string, password: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
        await page.getByTestId('email-input').clear();
        await page.getByTestId('password-input').clear();
        await page.getByTestId('email-input').fill(email);
        await page.getByTestId('password-input').fill(password);
        await page.getByTestId('login-button').click();

        const loginDeadline = Date.now() + 15_000;
        while (Date.now() < loginDeadline) {
            const currentUrl = page.url();
            if (/\/dashboard\/home(\?|$)/.test(currentUrl)) {
                break;
            }

            try {
                if (await hasAuthenticatedSession(page)) {
                    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
                    break;
                }
            } catch {}

            await page.waitForTimeout(500);
        }

        try {
            if (!/\/dashboard\/home(\?|$)/.test(page.url())) {
                await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            }
            await ensureAuthenticatedState(page);
            return;
        } catch {
            if (attempt === 2) {
                throw new Error('Login did not reach an authenticated dashboard state');
            }
            await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
        }
    }
}

async function completeRegistrationFlow(page: Page, userData: TestUserData): Promise<void> {
    await page.goto('/register');
    await page.waitForSelector('[data-testid="register-username-input"]', {
        timeout: 10000,
    });

    await page.getByTestId('register-username-input').fill(userData.username);
    await page.getByTestId('register-email-input').fill(userData.email);
    await page.getByTestId('register-password-input').fill(userData.password);
    await page.getByTestId('register-confirm-password-input').fill(userData.password);

    const organizationSlugInput = page.getByTestId('register-organization-slug-input');
    if ((await organizationSlugInput.count()) > 0) {
        await organizationSlugInput.fill(userData.organizationSlug);
    }

    await page.getByTestId('register-button').click();

    let outcome: 'dashboard' | 'login' | 'session' | null = null;

    try {
        await page.waitForURL(/\/(dashboard\/home|login)(\?|$)/, { timeout: 12000 });
        const currentUrl = page.url();
        if (/\/dashboard\/home(\?|$)/.test(currentUrl)) {
            outcome = 'dashboard';
        } else {
            outcome = 'login';
        }
    } catch {
        if (await hasAuthenticatedSession(page)) {
            outcome = 'session';
        }
    }

    if (!outcome) {
        throw new Error(`Registration did not complete. Current URL: ${page.url()}`);
    }

    if (outcome === 'login') {
        await loginWithCredentials(page, userData.email, userData.password);
        return;
    }

    if (outcome === 'session') {
        await page.goto('/dashboard/home');
        await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 10000 });
    }

    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 15000 });
    await ensureAuthenticatedState(page);
}

async function recoverAuthenticatedUser(page: Page, userData: TestUserData): Promise<boolean> {
    if (await hasAuthenticatedSession(page)) {
        try {
            await page.goto('/dashboard/home');
            await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 10000 });
            await ensureAuthenticatedState(page);
            return true;
        } catch {
            return false;
        }
    }

    try {
        await page.goto('/login');
        await loginWithCredentials(page, userData.email, userData.password);
        return true;
    } catch {
        return false;
    }
}

export async function createTestUser(
    page: Page,
    options?: CreateTestUserOptions
): Promise<TestUserData> {
    const hasCustomIdentity = Boolean(
        options?.customUsername || options?.customEmail || options?.customOrganizationSlug
    );
    const maxAttempts = hasCustomIdentity ? 1 : 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const userData = generateTestUserData(options);

        try {
            await completeRegistrationFlow(page, userData);

            return userData;
        } catch (error) {
            lastError = error;

            if (await recoverAuthenticatedUser(page, userData)) {
                return userData;
            }

            if (attempt < maxAttempts) {
                try {
                    await page.context().clearCookies();
                } catch {}
                continue;
            }
        }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Failed to create test user after ${maxAttempts} attempt(s): ${reason}`);
}

export async function createTestUserViaAPI(
    page: Page,
    options?: CreateTestUserOptions
): Promise<TestUserData> {
    const userData = generateTestUserData(options);
    const origin = process.env.BASE_URL || 'http://localhost:3000';
    const headers = { Origin: origin };
    const requestTimeout = 30000;

    let signUpResponse: Awaited<ReturnType<typeof page.request.post>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            signUpResponse = await page.request.post('/api/auth/sign-up/email', {
                headers,
                timeout: requestTimeout,
                data: {
                    email: userData.email,
                    password: userData.password,
                    name: userData.username,
                },
            });

            if (signUpResponse.ok() || signUpResponse.status() < 500 || attempt === 2) {
                break;
            }

            await page.waitForTimeout(1000);
            continue;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            if (
                attempt < 2 &&
                /ECONNRESET|fetch failed|ECONNREFUSED|ETIMEDOUT|Timeout .* exceeded/.test(message)
            ) {
                await page.waitForTimeout(1000);
                continue;
            }
            throw error;
        }
    }

    if (!signUpResponse || !signUpResponse.ok()) {
        const body = signUpResponse ? await signUpResponse.text() : 'No response';
        const status = signUpResponse ? signUpResponse.status() : 0;
        throw new Error(`Sign-up API failed (${status}): ${body}`);
    }

    let createOrgResponse: Awaited<ReturnType<typeof page.request.post>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        createOrgResponse = await page.request.post('/api/auth/organization/create', {
            headers,
            timeout: requestTimeout,
            data: {
                name: `${userData.username} Org`,
                slug: userData.organizationSlug,
            },
        });

        if (createOrgResponse.ok()) {
            break;
        }

        if (createOrgResponse.status() < 500 || attempt === 2) {
            break;
        }

        await page.waitForTimeout(1000);
    }

    if (!createOrgResponse || !createOrgResponse.ok()) {
        const body = createOrgResponse ? await createOrgResponse.text() : 'No response';
        const status = createOrgResponse ? createOrgResponse.status() : 0;
        throw new Error(`Create org API failed (${status}): ${body}`);
    }

    const orgPayload = (await createOrgResponse.json()) as { id?: string; data?: { id?: string } };
    const orgId = orgPayload.id ?? orgPayload.data?.id;

    if (!orgId) {
        throw new Error('Create org API did not return an organization ID');
    }

    const setActiveResponse = await page.request.post('/api/auth/organization/set-active', {
        headers,
        timeout: requestTimeout,
        data: { organizationId: orgId },
    });

    if (!setActiveResponse.ok()) {
        const body = await setActiveResponse.text();
        throw new Error(`Set active org API failed (${setActiveResponse.status()}): ${body}`);
    }

    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded', timeout: requestTimeout });
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: requestTimeout });
    await setActiveOrganizationViaBrowser(page, orgId);
    await ensureAuthenticatedState(page);

    return userData;
}

export async function loginUser(
    page: Page,
    email: string,
    password: string = DEFAULT_PASSWORD
): Promise<void> {
    await page.goto('/login');
    await loginWithCredentials(page, email, password);
    if (!/\/dashboard\/home(\?|$)/.test(page.url())) {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    }
    await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);
}

export async function logoutUser(page: Page): Promise<void> {
    const origin = process.env.BASE_URL || 'http://localhost:3000';

    await page.request
        .post('/api/auth/sign-out', {
            headers: { Origin: origin },
            timeout: 15000,
            data: {},
        })
        .catch(() => undefined);
    await page.context().clearCookies();
    await page
        .evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        })
        .catch(() => undefined);

    await expect
        .poll(async () => !(await hasAuthenticatedSession(page)), {
            timeout: 10000,
            intervals: [250, 500, 1000],
        })
        .toBe(true);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login(\?|$)/);
}

export interface CreateObjectiveOptions {
    title?: string;
    description?: string;
    category?: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    ensureCategories?: boolean;
}

export interface ObjectiveData {
    title: string;
    description: string;
    category: string;
    targetValue: number;
    currentValue: number;
    unit: string;
}

export async function createObjective(
    page: Page,
    options?: CreateObjectiveOptions
): Promise<ObjectiveData> {
    const uuid = randomUUID();
    const title = options?.title ?? `test-objective-${uuid.substring(0, 8)}`;
    const description = options?.description ?? 'Test objective description';
    const category = options?.category ?? 'Personal';
    const targetValue = options?.targetValue ?? 100;
    const currentValue = options?.currentValue ?? 0;
    const unit = options?.unit ?? 'units';

    if (options?.ensureCategories !== false) {
        await ensureDefaultCategories(page);
    }

    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="objective-create-open"]', { timeout: 15000 });

    let modalOpened = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByTestId('objective-create-open').click();
        try {
            await page.waitForSelector('[data-testid="objective-title-input"]', { timeout: 5000 });
            modalOpened = true;
            break;
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
    }

    if (!modalOpened) {
        throw new Error('Could not open create objective modal');
    }

    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(description);

    await page.getByTestId('objective-category-select').click();

    const enabledOptions = page.locator(
        '[role="option"]:not([data-disabled]):not([aria-disabled="true"])'
    );
    await expect(enabledOptions.first()).toBeVisible({ timeout: 10000 });

    const categoryOption = enabledOptions.filter({ hasText: new RegExp(category, 'i') }).first();
    if ((await categoryOption.count()) > 0) {
        await categoryOption.click();
    } else {
        await enabledOptions.first().click();
    }

    await page.getByTestId('objective-target-input').fill(`${targetValue}`);
    await page.getByTestId('objective-unit-input').fill(unit);

    await page.getByTestId('objective-save-button').click();

    await expect
        .poll(async () => await page.getByText(title).count(), {
            timeout: 15000,
            intervals: [500, 1000, 2000],
        })
        .toBeGreaterThan(0);

    return { title, description, category, targetValue, currentValue, unit };
}

const COLOR_NAME_TO_HEX: Record<string, string> = {
    Red: '#ef4444',
    Orange: '#f97316',
    Yellow: '#eab308',
    Green: '#22c55e',
    Teal: '#14b8a6',
    Blue: '#3b82f6',
    Purple: '#a855f7',
    Pink: '#ec4899',
    Gray: '#6b7280',
};

function colorNameToHex(color: string): string | undefined {
    return COLOR_NAME_TO_HEX[color];
}

export interface CreateCategoryOptions {
    name?: string;
    color?: string;
}

export interface CategoryData {
    name: string;
    color: string;
}

async function getConvexAuthToken(page: Page): Promise<string> {
    const deadline = Date.now() + 15_000;

    while (Date.now() < deadline) {
        try {
            const response = await page.request.get('/api/auth/convex/token');
            if (!response.ok()) {
                await page.waitForTimeout(500);
                continue;
            }

            const payload = (await response.json()) as { token?: string } | null;
            if (typeof payload?.token === 'string' && payload.token.length > 0) {
                return payload.token;
            }
        } catch {}

        await page.waitForTimeout(500);
    }

    throw new Error('Convex auth token response did not include a token');
}

async function createConvexClient(page: Page): Promise<ConvexHttpClient> {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_SELF_HOSTED_URL;
    if (!convexUrl) {
        throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured for Playwright tests');
    }

    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(await getConvexAuthToken(page));
    return client;
}

export async function createCategory(
    page: Page,
    options?: CreateCategoryOptions
): Promise<CategoryData> {
    const uuid = randomUUID();
    const name = options?.name ?? `test-category-${uuid.substring(0, 8)}`;
    const color = options?.color ?? 'Blue';

    await ensureAuthenticatedState(page);
    const client = await createConvexClient(page);
    await client.mutation(api.categories.createCategory, {
        name,
        color,
    });

    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });

    let count = 0;
    const maxTime = Date.now() + 20_000;

    while (Date.now() < maxTime && count === 0) {
        count = await page.getByTestId('table-row').filter({ hasText: name }).count();
        if (count === 0) {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1000);
        }
    }

    expect(count).toBeGreaterThan(0);
    return { name, color };
}

const PERSONAL_ROW = /\bPersonal\b/i;

function personalCategoryTableRowCount(page: Page) {
    return page.getByTestId('table-row').filter({ hasText: PERSONAL_ROW }).count();
}

async function hasVisiblePersonalCategory(page: Page): Promise<boolean> {
    if ((await personalCategoryTableRowCount(page)) > 0) {
        return true;
    }

    return page
        .getByText(PERSONAL_ROW)
        .first()
        .isVisible()
        .catch(() => false);
}

export async function ensureDefaultCategories(page: Page): Promise<void> {
    await ensureAuthenticatedState(page);

    const client = await createConvexClient(page);
    await client
        .mutation(api.categories.createCategory, {
            name: 'Personal',
            color: 'Blue',
        })
        .catch(() => undefined);

    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('category-create-open')).toBeVisible({ timeout: 15_000 });

    let hasPersonalCategory = false;
    const maxWait = Date.now() + 8_000;

    while (Date.now() < maxWait && !hasPersonalCategory) {
        hasPersonalCategory = await hasVisiblePersonalCategory(page);

        if (!hasPersonalCategory) {
            await page.waitForTimeout(300);
        }
    }

    if (hasPersonalCategory) {
        return;
    }

    const maxVerify = Date.now() + 15_000;
    while (Date.now() < maxVerify) {
        hasPersonalCategory = await hasVisiblePersonalCategory(page);
        if (hasPersonalCategory) {
            return;
        }
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
    }

    await expect(page.getByText(PERSONAL_ROW).first()).toBeVisible({ timeout: 5_000 });
}

export interface CreateOrganizationOptions {
    name?: string;
    description?: string;
}

export interface OrganizationData {
    name: string;
    description: string;
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

    let nameCount = 0;
    const maxTime = Date.now() + 15000;

    while (Date.now() < maxTime && nameCount === 0) {
        nameCount = await page.getByText(name).count();
        if (nameCount === 0) {
            await page.waitForTimeout(500);
        }
    }

    expect(nameCount).toBeGreaterThan(0);
    return { name, description };
}

export interface CreateNotificationOptions {
    message?: string;
    type?: string;
}

export interface NotificationData {
    message: string;
    type: string;
}

export async function createNotification(
    page: Page,
    objectiveTitle: string,
    options?: CreateNotificationOptions
): Promise<NotificationData> {
    const uuid = randomUUID();
    const message = options?.message ?? `test-notification-${uuid.substring(0, 8)}`;
    const type = options?.type ?? 'reminder';

    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-testid="notification-create-open"]', { timeout: 15000 });

    await page.getByTestId('notification-create-open').click();
    await page.getByTestId('notification-objective-select').click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const objectiveOption = page.getByRole('option').filter({ hasText: objectiveTitle }).first();
    if ((await objectiveOption.count()) > 0) {
        await objectiveOption.click();
    } else {
        await page.getByRole('option').first().click();
    }
    await page.getByTestId('notification-type-input').fill(type);
    await page.getByTestId('notification-message-input').fill(message);
    await page.getByTestId('notification-save-button').click();

    await expect(page.getByText(message)).toBeVisible({ timeout: 10000 });

    return { message, type };
}

export async function promoteToAdmin(page: Page): Promise<void> {
    return setupPlatformAsAdmin(page);
}

export async function setupPlatformAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });

    for (let attempt = 0; attempt < 3; attempt++) {
        await page.evaluate(async () => {
            const setupResponse = await fetch('/api/test/setup-platform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            if (!setupResponse.ok) {
                const body = await setupResponse.text();
                throw new Error(`Setup platform failed: ${setupResponse.status} ${body}`);
            }

            return await setupResponse.json();
        });

        await page.reload({ waitUntil: 'domcontentloaded' });
        const adminMenuItem = page.locator('a[href*="/dashboard/admin"], [data-testid*="admin"]');
        try {
            await expect(adminMenuItem.first()).toBeVisible({ timeout: 5000 });
            return;
        } catch {}
    }

    throw new Error('Failed to setup platform as admin after retries');
}

export async function waitForToast(page: Page, message: string | RegExp): Promise<void> {
    const toast = page.locator('[data-sonner-toast]', { hasText: message });
    await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function waitForConvexData(
    page: Page,
    testId: string,
    options?: { timeout?: number }
): Promise<void> {
    const timeout = options?.timeout ?? 15000;
    await expect(page.getByTestId(testId)).toBeVisible({ timeout });
}

export async function openModal(
    page: Page,
    triggerTestId: string,
    contentTestId: string,
    options?: { maxAttempts?: number; timeout?: number }
): Promise<void> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const timeout = options?.timeout ?? 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await page.getByTestId(triggerTestId).click();
        try {
            await expect(page.getByTestId(contentTestId)).toBeVisible({ timeout });
            return;
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
    }

    throw new Error(`Could not open modal: trigger=${triggerTestId}, content=${contentTestId}`);
}

export async function selectDropdownOption(
    page: Page,
    triggerTestId: string,
    optionText: string | RegExp,
    options?: { timeout?: number; fallbackToFirst?: boolean }
): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    const fallbackToFirst = options?.fallbackToFirst ?? false;

    await page.getByTestId(triggerTestId).click();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout });

    const option = page.getByRole('option').filter({ hasText: optionText }).first();

    if ((await option.count()) > 0) {
        await option.click();
        return;
    }

    if (fallbackToFirst) {
        await page.getByRole('option').first().click();
        return;
    }

    throw new Error(`Dropdown option not found: ${optionText}`);
}

export async function navigateAndWaitForContent(
    page: Page,
    path: string,
    contentTestId: string,
    options?: { timeout?: number }
): Promise<void> {
    const timeout = options?.timeout ?? 15000;
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(contentTestId)).toBeVisible({ timeout });
}

export function getPageOrigin(page: Page): string {
    const url = page.url();
    try {
        return new URL(url).origin;
    } catch {
        return process.env.BASE_URL || 'http://localhost:3000';
    }
}
