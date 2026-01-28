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
    // (leaves room for the '-xxxxxxxx' suffix added later)
    return normalized.substring(0, 20);
}

// Nombres presentables para capturas de TFG
const PRESENTABLE_NAMES = [
    'Miguel García',
    'Ana Martínez',
    'Carlos López',
    'Laura Sánchez',
    'David Fernández',
];

/**
 * Creates a safe organization slug that is guaranteed to be under 30 characters.
 * BetterAuth has a 30 character limit on organization slugs.
 * Format: {base}-{suffix} where total length <= 30 chars
 */
function createSafeSlug(name: string, suffix: string): string {
    const normalized = normalizeForSlug(name);
    // Max length for base = 30 - 1 (hyphen) - suffix.length
    const maxBaseLength = 30 - 1 - suffix.length;
    const base = normalized.substring(0, Math.max(1, maxBaseLength));
    return `${base}-${suffix}`;
}

/**
 * Creates a test user with options for TFG documentation screenshots.
 * When usePresentableName is true, uses a realistic name instead of UUID.
 */
export async function createTestUser(
    page: Page,
    options?: {
        password?: string;
        /** Use a presentable name for TFG documentation screenshots */
        usePresentableName?: boolean;
        /** Custom username to use */
        customUsername?: string;
        /** Custom email to use */
        customEmail?: string;
        /** Custom organization slug to use */
        customOrganizationSlug?: string;
    }
) {
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
        // Use a presentable name for TFG screenshots
        const randomName = PRESENTABLE_NAMES[Math.floor(Math.random() * PRESENTABLE_NAMES.length)];
        username = randomName;
        email = `${normalizeForEmail(randomName)}.${shortId}@example.com`;
        organizationSlug = createSafeSlug(randomName, shortId);
    } else {
        username = `usernametest-${uuid}`;
        email = `useremail-${uuid}@useremail.com`;
        organizationSlug = `o-${shortId}`; // Simplified to 'o-' instead of 'org-' to be shorter
    }

    const password = options?.password ?? DEFAULT_PASSWORD;

    await page.goto('/register');

    // Wait for form to be ready
    await page.waitForSelector('[data-testid="register-username-input"]');

    // Fill form fields
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill(password);
    await page.getByTestId('register-confirm-password-input').fill(password);
    await page.getByTestId('register-organization-slug-input').fill(organizationSlug);

    // Submit registration
    await page.getByTestId('register-button').click();

    // Wait for either success or redirect to login with increased timeout
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Check where we ended up
    let currentUrl = page.url();
    // console.log('After registration, current URL:', currentUrl);

    // Check for error messages first
    const errorMessage = await page
        .locator('.text-destructive, [role="alert"], .alert-destructive')
        .first()
        .textContent()
        .catch(() => null);
    if (errorMessage) {
        console.log('Found error message after registration:', errorMessage);
    }

    if (currentUrl.includes('/dashboard/home')) {
        // Registration successful
        await expect(page).toHaveURL(/\/dashboard\/home$/);
    } else if (currentUrl.includes('/login')) {
        // Need to login after registration
        console.log('Registration redirected to login, attempting login...');

        await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });

        // Clear any existing values and fill form
        await page.getByTestId('email-input').clear();
        await page.getByTestId('password-input').clear();
        await page.getByTestId('email-input').fill(email);
        await page.getByTestId('password-input').fill(password);

        // Check if there are any error messages before submitting
        const errorMessage = await page
            .locator('.text-destructive, [role="alert"]')
            .first()
            .textContent()
            .catch(() => null);
        if (errorMessage) {
            console.log('Found error message before login:', errorMessage);
        }

        await page.getByTestId('login-button').click();

        // Wait for navigation or error
        try {
            await page.waitForURL(/\/dashboard\/home$/, { timeout: 10000 });
        } catch (error) {
            currentUrl = page.url();
            console.log('After login attempt, URL:', currentUrl);

            // Check for error messages
            const loginError = await page
                .locator('.text-destructive, [role="alert"]')
                .first()
                .textContent()
                .catch(() => null);
            if (loginError) {
                console.log('Login error message:', loginError);
            }

            // Check if user exists by trying to register again with same email
            if (currentUrl.includes('/register')) {
                console.log('Login failed, user might not have been created properly');
                throw new Error('User registration may have failed');
            }

            throw error;
        }

        await expect(page).toHaveURL(/\/dashboard\/home$/);
    } else {
        // Unexpected redirect
        console.log('Unexpected URL after registration:', currentUrl);
        throw new Error(
            `Registration failed. Expected /dashboard/home or /login, got ${currentUrl}`
        );
    }

    return { username, email, password };
}

export async function loginUser(page: Page, email: string, password: string = DEFAULT_PASSWORD) {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/dashboard\/home$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/home$/);
}

export function getPageOrigin(page: Page) {
    const url = page.url();
    try {
        return new URL(url).origin;
    } catch {
        const fallback = process.env.BASE_URL || 'http://localhost:3000';
        return new URL(fallback).origin;
    }
}

/**
 * Helper function to create an objective
 * @param page - Playwright page object
 * @param options - Objective options
 */
export async function createObjective(
    page: Page,
    options?: {
        title?: string;
        description?: string;
        category?: string;
        targetValue?: number;
        currentValue?: number;
        unit?: string;
        status?: string;
        deadline?: number;
        /** Ensure categories exist before creating objective */
        ensureCategories?: boolean;
    }
) {
    const uuid = randomUUID();
    const title = options?.title ?? `test-objective-${uuid}`;
    const description = options?.description ?? 'Test objective description';
    // Use 'Personal' which is the category expected by tests
    // If the test specifies a custom category, use that
    const category = options?.category ?? 'Personal';
    const targetValue = options?.targetValue ?? 100;
    const currentValue = options?.currentValue ?? 0;
    const unit = options?.unit ?? 'units';

    // If requested, ensure categories exist first
    if (options?.ensureCategories !== false) {
        await ensureDefaultCategories(page);
    }

    await page.goto('/dashboard/objectives');
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(description);

    // Handle category selection - use data-testid approach if available
    await page.getByTestId('objective-category-select').click();
    // Wait for the dropdown options to load and be visible
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    // Try to find the option by text, with a more robust selector
    const categoryOption = page.getByRole('option', { name: new RegExp(category, 'i') }).first();
    await categoryOption.click();

    await page.getByTestId('objective-target-input').fill(String(targetValue));
    await page.getByTestId('objective-unit-input').fill(unit);
    await page.getByTestId('objective-current-input').fill(String(currentValue));
    await page.getByTestId('objective-save-button').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    return { title, description, category, targetValue, currentValue, unit };
}

/**
 * Helper function to create a notification
 * @param page - Playwright page object
 * @param objectiveTitle - Title of the objective to link the notification to
 * @param options - Notification options
 */
export async function createNotification(
    page: Page,
    objectiveTitle: string,
    options?: {
        message?: string;
        type?: string;
    }
) {
    const uuid = randomUUID();
    const message = options?.message ?? `test-notification-${uuid}`;
    const type = options?.type ?? 'reminder';

    await page.goto('/dashboard/notifications');
    await page.getByTestId('notification-create-open').click();
    await page.getByTestId('notification-objective-select').click();
    await page.getByRole('option', { name: objectiveTitle }).click();
    await page.getByTestId('notification-type-input').fill(type);
    await page.getByTestId('notification-message-input').fill(message);
    await page.getByTestId('notification-save-button').click();
    await expect(page.getByText(message)).toBeVisible({ timeout: 10000 });

    return { message, type };
}

/**
 * Helper function to create an organization.
 * Note: Slug is auto-generated from the name by BetterAuth.
 * @param page - Playwright page object
 * @param options - Organization options
 */
export async function createOrganization(
    page: Page,
    options?: {
        name?: string;
        description?: string;
    }
) {
    const uuid = randomUUID();
    const name = options?.name ?? `test-org-${uuid}`;
    const description = options?.description ?? 'Test organization description';

    await page.goto('/dashboard/organizations');
    await page.getByTestId('organization-create-open').click();
    await page.getByTestId('organization-name-input').fill(name);
    await page.getByTestId('organization-description-input').fill(description);
    await page.getByTestId('organization-save-button').click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    return { name, description };
}

/**
 * Ensures default categories exist for the current user.
 * If the categories page shows no categories, creates them manually.
 * Creates a simple "Personal" category for tests (not "Personal Development").
 * @param page - Playwright page object
 */
export async function ensureDefaultCategories(page: Page): Promise<void> {
    await page.goto('/dashboard/categories');
    await page.waitForLoadState('networkidle');

    // Check if "Personal" category already exists
    const personalCategoryExists = await page.getByText('Personal').count() > 0;

    if (!personalCategoryExists) {
        // Create a simple "Personal" category for tests
        await page.getByTestId('category-create-open').click();
        await page.getByTestId('category-name-input').fill('Personal');
        // Color is a Select component, click and select a color (Green/#22c55e)
        await page.getByTestId('category-color-select').click();
        // Select the Green option by text
        await page.getByRole('option', { name: 'Green' }).click();
        await page.getByTestId('category-save-button').click();
        // Wait for the category to be saved and visible
        await expect(page.getByText('Personal')).toBeVisible({ timeout: 10000 });
        await page.waitForLoadState('networkidle');
    }
}

/**
 * Helper function to take organized screenshots for TFG documentation
 * @param page - Playwright page object
 * @param testName - Name of the test (will be sanitized for filename)
 * @param step - Description of the step being captured
 * @param suffix - Optional suffix for the filename
 */
export async function takeScreenshot(page: Page, testName: string, step: string, suffix?: string) {
    // // Sanitize test name and step for filename
    // const sanitize = (str: string) =>
    //     str
    //         .toLowerCase()
    //         .replace(/[^a-z0-9]+/g, '-')
    //         .replace(/^-|-$/g, '');
    // const testNameClean = sanitize(testName);
    // const stepClean = sanitize(step);
    // const suffixClean = suffix ? `-${sanitize(suffix)}` : '';
    // const filename = `test-results/screenshots/${testNameClean}-${stepClean}${suffixClean}.png`;
    // await page.screenshot({
    //     path: filename,
    //     fullPage: true,
    //     animations: 'disabled', // Disable animations for consistent screenshots
    // });
}

/**
 * Promotes the current logged-in user to admin role.
 * This calls the Convex mutation from the browser context.
 * User must already be logged in.
 */
export async function promoteToAdmin(page: Page): Promise<void> {
    // Navigate to dashboard to ensure we're in an authenticated context
    await page.goto('/dashboard/home');
    await page.waitForLoadState('networkidle');

    // Call the promoteToAdmin mutation via the browser's Convex client
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

    console.log('✅ User promoted to admin:', result);

    // Wait for the database to sync the new role
    await page.waitForTimeout(2000);

    // Reload to refresh user context with new role
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait a bit more for the session to update
    await page.waitForTimeout(1000);

    // Verify admin access by checking if admin menu is visible
    const adminMenuItem = page.locator('a[href*="admin"], [data-testid*="admin"]').first();
    try {
        await adminMenuItem.waitFor({ state: 'visible', timeout: 5000 });
        console.log('✅ Admin menu item is now visible');
    } catch {
        console.log('⚠️ Admin menu item not found, attempting another reload...');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    }
}

/**
 * Creates a test user specifically for TFG documentation with presentable name.
 * Adds a short UUID to make the user unique for each test run.
 */
export async function createTFGTestUser(
    page: Page,
    name: string = 'Miguel Garcia'
): Promise<{ username: string; email: string; password: string }> {
    const shortId = randomUUID().slice(0, 8);

    return createTestUser(page, {
        usePresentableName: false,
        customUsername: name,
        customEmail: `${normalizeForEmail(name)}.${shortId}@example.com`,
        customOrganizationSlug: `org-${shortId}`, // Use simple org slug to avoid validation issues
    });
}
