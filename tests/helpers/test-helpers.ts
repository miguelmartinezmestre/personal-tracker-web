import { Page, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

export const DEFAULT_PASSWORD = '12345678';

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

/**
 * Creates a test user by registering through the UI.
 * Handles both direct dashboard redirect and login redirect scenarios.
 */
export async function createTestUser(
    page: Page,
    options?: CreateTestUserOptions
): Promise<TestUserData> {
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
        const randomName = presentableNames[Math.floor(Math.random() * presentableNames.length)];
        username = randomName;
        email = `${normalizeForEmail(randomName)}.${shortId}@example.com`;
        organizationSlug = createSafeSlug(randomName, shortId);
    } else {
        username = `testuser-${shortId}`;
        email = `testuser-${shortId}@test.com`;
        organizationSlug = `org-${shortId}`;
    }

    const password = options?.password ?? DEFAULT_PASSWORD;

    await page.goto('/register');
    await page.waitForSelector('[data-testid="register-username-input"]');

    // Fill registration form
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill(password);
    await page.getByTestId('register-confirm-password-input').fill(password);
    await page.getByTestId('register-organization-slug-input').fill(organizationSlug);

    // Submit
    await page.getByTestId('register-button').click();

    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard/home')) {
        await expect(page).toHaveURL(/\/dashboard\/home$/);
    } else if (currentUrl.includes('/login')) {
        // Need to login after registration
        await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
        await page.getByTestId('email-input').clear();
        await page.getByTestId('password-input').clear();
        await page.getByTestId('email-input').fill(email);
        await page.getByTestId('password-input').fill(password);
        await page.getByTestId('login-button').click();
        await page.waitForURL(/\/dashboard\/home$/, { timeout: 10000 });
        await expect(page).toHaveURL(/\/dashboard\/home$/);
    } else {
        throw new Error(
            `Registration failed. Expected /dashboard/home or /login, got ${currentUrl}`
        );
    }

    return { username, email, password, organizationSlug };
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
    await page.waitForSelector('[data-testid="email-input"]');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/dashboard\/home$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/home$/);
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

    await page.goto('/dashboard/objectives');
    await page.waitForLoadState('networkidle');

    // Open create modal
    await page.getByTestId('objective-create-open').click();
    await page.waitForSelector('[data-testid="objective-title-input"]');

    // Fill form
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(description);

    // Select category
    await page.getByTestId('objective-category-select').click();
    await page.waitForTimeout(500); // Wait for dropdown animation
    await page.waitForSelector('[role="option"]', { timeout: 10000 });

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
    await page.getByTestId('objective-target-input').fill(String(targetValue));
    await page.getByTestId('objective-unit-input').fill(unit);
    await page.getByTestId('objective-current-input').fill(String(currentValue));

    // Save
    await page.getByTestId('objective-save-button').click();

    // Wait for objective to appear in list
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    return { title, description, category, targetValue, currentValue, unit };
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

    await page.goto('/dashboard/categories');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('category-create-open').click();
    await page.waitForSelector('[data-testid="category-name-input"]', { timeout: 5000 });

    await page.getByTestId('category-name-input').fill(name);
    await page.getByTestId('category-color-select').click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const colorOption = page
        .getByRole('option')
        .filter({ hasText: new RegExp(color, 'i') })
        .first();
    if ((await colorOption.count()) > 0) {
        await colorOption.click();
    } else {
        await page.getByRole('option').first().click();
    }
    await page.getByTestId('category-save-button').click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    return { name, color };
}

/**
 * Ensures default categories exist for the current user.
 */
export async function ensureDefaultCategories(page: Page): Promise<void> {
    await page.goto('/dashboard/categories');
    await page.waitForLoadState('networkidle');

    // Wait for table/list to load
    await page.waitForTimeout(1000);

    // Check for Personal category in table rows specifically
    const categoryTable = page.locator('table, [data-testid*="categories"]');
    const personalCategoryExists = (await categoryTable.locator('text=Personal').count()) > 0;

    if (!personalCategoryExists) {
        await createCategory(page, { name: 'Personal', color: 'Green' });
        await page.waitForTimeout(3000); // Extra wait for Convex sync
        await page.reload();
        await page.waitForLoadState('networkidle');
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
    await page.waitForLoadState('networkidle');

    await page.getByTestId('organization-create-open').click();
    await page.getByTestId('organization-name-input').fill(name);
    await page.getByTestId('organization-description-input').fill(description);
    await page.getByTestId('organization-save-button').click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

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
    await page.waitForLoadState('networkidle');

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
 * Promotes the current logged-in user to admin role.
 */
export async function promoteToAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard/home');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
        const response = await fetch('/api/test/promote-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Promote admin failed: ${response.status} ${body}`);
        }

        return await response.json();
    });

    // console.log('User promoted to admin:', result);

    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
}

/**
 * Takes a screenshot for documentation.
 */
export async function takeScreenshot(
    page: Page,
    testName: string,
    step: string,
    _suffix?: string
): Promise<void> {
    // Screenshots disabled by default - enable for documentation
    // const sanitize = (str: string) =>
    //     str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    // const filename = `test-results/screenshots/${sanitize(testName)}-${sanitize(step)}.png`;
    // await page.screenshot({ path: filename, fullPage: true, animations: 'disabled' });
    void testName;
    void step;
}

/**
 * Waits for a toast message to appear.
 */
export async function waitForToast(page: Page, message: string | RegExp): Promise<void> {
    const toast = page.locator('[data-sonner-toast]', { hasText: message });
    await expect(toast).toBeVisible({ timeout: 5000 });
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
