import { Page, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

export const DEFAULT_PASSWORD = 'Password123';

/**
 * Normalizes a name for use in email addresses by removing accents and special characters.
 */
function normalizeForEmail(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, ''); // Keep only alphanumeric and dots
}

/**
 * Normalizes a name for use in organization slugs.
 * Only allows lowercase letters, numbers, and hyphens (per organizationSlug schema validation).
 * Also truncates to max 20 characters to stay under BetterAuth's 30 character limit.
 */
function normalizeForSlug(name: string): string {
    const normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Keep only alphanumeric and hyphens
        .replace(/-+/g, '-') // Collapse multiple hyphens to one
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Truncate to max 20 characters to stay under BetterAuth's 30 character limit
    return normalized.substring(0, 20);
}

/**
 * Creates a safe organization slug that is guaranteed to be under 30 characters.
 */
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

    const label = ((await switcher.first().textContent()) ?? '')
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
        return await page.evaluate(async id => {
            const response = await fetch('/api/auth/organization/set-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ organizationId: id }),
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
    } catch {
        // Best effort only. Some flows can continue without creating an organization here.
    }
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
    if ((await hasActiveOrganization(page)) || (await hasOrganizationSelectedInUI(page))) {
        return;
    }

    const timeoutAt = Date.now() + timeout;
    while (Date.now() < timeoutAt) {
        const organizationIds = await getOrganizationIds(page);
        for (const organizationId of organizationIds) {
            if (await setActiveOrganizationViaBrowser(page, organizationId)) {
                await page.goto('/dashboard/home');
                await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 10000 });
                return;
            }
        }

        if (await setActiveOrganizationViaUi(page)) {
            await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
            return;
        }
    }

    // Some auth payloads do not expose active organization consistently.
    // If explicit activation did not succeed, continue with best-effort dashboard navigation.
    try {
        await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    } catch {
        // Keep the current state and let downstream assertions report if navigation is broken.
    }
}

async function ensureAuthenticatedState(page: Page): Promise<void> {
    await waitForAuthenticatedSession(page);
    await ensureOrganizationExists(page);
    await ensureActiveOrganization(page);
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
}

async function loginWithCredentials(page: Page, email: string, password: string): Promise<void> {
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
    await page.getByTestId('email-input').clear();
    await page.getByTestId('password-input').clear();
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 15000 });
    await ensureAuthenticatedState(page);
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

    // Support both register form variants (with and without organization slug input).
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

/**
 * Creates a test user by registering through the UI.
 * Handles both direct dashboard redirect and login redirect scenarios.
 */
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
                } catch {
                    // Ignore cleanup failures and proceed to the next attempt.
                }
                continue;
            }
        }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Failed to create test user after ${maxAttempts} attempt(s): ${reason}`);
}

/**
 * Creates a test user via API calls instead of UI registration.
 * Uses page.request which shares cookies with the browser context,
 * so the page is authenticated after the API calls complete.
 */
export async function createTestUserViaAPI(
    page: Page,
    options?: CreateTestUserOptions
): Promise<TestUserData> {
    const userData = generateTestUserData(options);
    const origin = process.env.BASE_URL || 'http://localhost:3000';
    const headers = { Origin: origin };

    // Step 1: Sign up via API (with retry for transient network errors like ECONNRESET)
    let signUpResponse: Awaited<ReturnType<typeof page.request.post>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            signUpResponse = await page.request.post('/api/auth/sign-up/email', {
                headers,
                data: {
                    email: userData.email,
                    password: userData.password,
                    name: userData.username,
                },
            });
            break;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            if (attempt < 2 && /ECONNRESET|fetch failed|ECONNREFUSED/.test(message)) {
                await page.waitForTimeout(1000); // Legitimate backoff for transient network error
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

    // Step 2: Create organization via API
    const createOrgResponse = await page.request.post('/api/auth/organization/create', {
        headers,
        data: {
            name: `${userData.username} Org`,
            slug: userData.organizationSlug,
        },
    });

    if (!createOrgResponse.ok()) {
        const body = await createOrgResponse.text();
        throw new Error(`Create org API failed (${createOrgResponse.status()}): ${body}`);
    }

    const orgPayload = (await createOrgResponse.json()) as { id?: string; data?: { id?: string } };
    const orgId = orgPayload.id ?? orgPayload.data?.id;

    if (!orgId) {
        throw new Error('Create org API did not return an organization ID');
    }

    // Step 3: Set active organization via API
    const setActiveResponse = await page.request.post('/api/auth/organization/set-active', {
        headers,
        data: { organizationId: orgId },
    });

    if (!setActiveResponse.ok()) {
        const body = await setActiveResponse.text();
        throw new Error(`Set active org API failed (${setActiveResponse.status()}): ${body}`);
    }

    // Step 4: Navigate to dashboard to verify session is working
    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/home(\?|$)/, { timeout: 15000 });

    return userData;
}

/**
 * Logs in an existing user.
 */
export async function loginUser(
    page: Page,
    email: string,
    password: string = DEFAULT_PASSWORD
): Promise<void> {
    await page.goto('/login');
    await loginWithCredentials(page, email, password);
    await expect(page).toHaveURL(/\/dashboard\/home(\?|$)/);
}

/**
 * Logs out the current user by clearing cookies.
 */
export async function logoutUser(page: Page): Promise<void> {
    await page.context().clearCookies();
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

/**
 * Creates an objective through the UI.
 */
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

    // Ensure categories exist first if not explicitly disabled
    if (options?.ensureCategories !== false) {
        await ensureDefaultCategories(page);
    }

    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="objective-create-open"]', { timeout: 15000 });

    // Open create modal
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

    // Fill form
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(description);

    // Select category
    await page.getByTestId('objective-category-select').click();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10000 });

    // Try to find the category option with more flexibility
    const categoryOption = page
        .getByRole('option')
        .filter({ hasText: new RegExp(category, 'i') })
        .first();
    if ((await categoryOption.count()) > 0) {
        await categoryOption.click();
    } else {
        // Fallback: click the first available option
        const firstOption = page.getByRole('option').first();
        await firstOption.click();
    }

    // Fill numeric values
    await page.getByTestId('objective-target-input').fill(`${targetValue}`);
    await page.getByTestId('objective-unit-input').fill(unit);

    // Save
    await page.getByTestId('objective-save-button').click();

    // Wait for objective to appear in visible table rows (avoid hidden mobile-card duplicates)
    const createdObjectiveRow = page.getByTestId('table-row').filter({ hasText: title }).first();
    await expect(createdObjectiveRow).toBeVisible({ timeout: 15000 });

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

/**
 * Creates a category through the UI.
 */
export async function createCategory(
    page: Page,
    options?: CreateCategoryOptions
): Promise<CategoryData> {
    const uuid = randomUUID();
    const name = options?.name ?? `test-category-${uuid.substring(0, 8)}`;
    const color = options?.color ?? 'Green';

    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="category-create-open"]', { timeout: 15000 });

    let modalOpened = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByTestId('category-create-open').click();
        try {
            await page.waitForSelector('[data-testid="category-name-input"]', { timeout: 5000 });
            modalOpened = true;
            break;
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
        }
    }

    if (!modalOpened) {
        throw new Error('Could not open create category modal');
    }

    await page.getByTestId('category-name-input').fill(name);
    await page.getByTestId('category-color-select').click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const hex = colorNameToHex(color);
    if (hex) {
        const colorOption = page.getByTestId(`category-color-${hex}`);
        await colorOption.click();
    } else {
        await page.getByRole('option').first().click();
    }
    await page.getByTestId('category-save-button').click();
    await expect
        .poll(async () => await page.getByTestId('table-row').filter({ hasText: name }).count(), {
            timeout: 15000,
            intervals: [500, 1000, 2000],
        })
        .toBeGreaterThan(0);

    return { name, color };
}

/**
 * Ensures default categories exist for the current user.
 */
export async function ensureDefaultCategories(page: Page): Promise<void> {
    await page.goto('/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('category-create-open')).toBeVisible({ timeout: 15000 });

    // Wait for table to stabilise (Convex real-time data may arrive after initial render)
    const personalCategoryExists = await expect
        .poll(
            async () =>
                await page
                    .getByTestId('table-row')
                    .filter({ hasText: /\bPersonal\b/i })
                    .count(),
            { timeout: 5000, intervals: [500, 1000] }
        )
        .toBeGreaterThan(0)
        .then(() => true)
        .catch(() => false);

    if (!personalCategoryExists) {
        await createCategory(page, { name: 'Personal', color: 'Green' });
    }
}

export interface CreateOrganizationOptions {
    name?: string;
    description?: string;
}

export interface OrganizationData {
    name: string;
    description: string;
}

/**
 * Creates an organization through the UI.
 */
export async function createOrganization(
    page: Page,
    options?: CreateOrganizationOptions
): Promise<OrganizationData> {
    const uuid = randomUUID();
    const name = options?.name ?? `test-org-${uuid.substring(0, 8)}`;
    const description = options?.description ?? 'Test organization description';

    await page.goto('/dashboard/organizations');
    await page.waitForURL(/\/dashboard\/organizations(\?|$)/, { timeout: 15000 });

    // Wait for organizations page to be ready
    await page.waitForSelector('[data-testid="organizations-title"]', { timeout: 15000 });
    await page.getByTestId('organization-create-open').click();
    await page.waitForSelector('[data-testid="organization-name-input"]', { timeout: 5000 });
    await page.getByTestId('organization-name-input').fill(name);
    await page.getByTestId('organization-description-input').fill(description);
    await page.getByTestId('organization-save-button').click();

    // Wait for org to appear in list (Convex mutation is async)
    await expect(page.getByTestId('table-row').filter({ hasText: name }).first()).toBeVisible({
        timeout: 15000,
    });

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

/**
 * Creates a notification through the UI.
 */
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

/**
 * Promotes the current logged-in user to admin role via the setup-platform test endpoint.
 * This completes the platform setup wizard programmatically, which creates the admin user,
 * organization, and default categories.
 *
 * @deprecated Prefer using the shared admin storageState from auth.setup.ts instead.
 */
export async function promoteToAdmin(page: Page): Promise<void> {
    return setupPlatformAsAdmin(page);
}

/**
 * Completes platform setup via /api/test/setup-platform, promoting the current user to admin.
 * Only works on a fresh platform (no existing platformSettings).
 * Requires ALLOW_SETUP_TEST=true.
 *
 * @deprecated Prefer using the shared admin storageState from auth.setup.ts instead.
 */
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
        } catch {
            // Retry on next iteration
        }
    }

    throw new Error('Failed to setup platform as admin after retries');
}

/**
 * Waits for a toast message to appear.
 */
export async function waitForToast(page: Page, message: string | RegExp): Promise<void> {
    const toast = page.locator('[data-sonner-toast]', { hasText: message });
    await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * Waits for Convex real-time data to appear in the DOM.
 * Replaces `waitForLoadState('load') + waitForTimeout()` pattern.
 */
export async function waitForConvexData(
    page: Page,
    testId: string,
    options?: { timeout?: number }
): Promise<void> {
    const timeout = options?.timeout ?? 15000;
    await expect(page.getByTestId(testId)).toBeVisible({ timeout });
}

/**
 * Opens a modal by clicking a trigger and waiting for content to appear.
 * Retries with Escape if the modal doesn't open.
 */
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

/**
 * Selects an option from a dropdown/select trigger.
 * Waits for options to appear before selecting.
 */
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

/**
 * Navigates to a page and waits for specific content to appear.
 * Replaces `goto() + waitForLoadState('load')` pattern for Convex pages.
 */
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

/**
 * Gets the page origin URL.
 */
export function getPageOrigin(page: Page): string {
    const url = page.url();
    try {
        return new URL(url).origin;
    } catch {
        return process.env.BASE_URL || 'http://localhost:3000';
    }
}
