import { Page, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

export const DEFAULT_PASSWORD = '12345678';

export async function createTestUser(
    page: Page,
    options?: {
        password?: string;
    }
) {
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;
    const password = options?.password ?? DEFAULT_PASSWORD;

    await page.goto('/register');

    // Wait for form to be ready
    await page.waitForSelector('[data-testid="register-username-input"]');

    // Fill form fields
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill(password);
    await page.getByTestId('register-confirm-password-input').fill(password);

    // Submit registration
    await page.getByTestId('register-button').click();

    // Wait for either success or redirect to login
    await page.waitForLoadState('networkidle');

    // Check where we ended up
    let currentUrl = page.url();
    console.log('After registration, current URL:', currentUrl);

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
    }
) {
    const uuid = randomUUID();
    const title = options?.title ?? `test-objective-${uuid}`;
    const description = options?.description ?? 'Test objective description';
    const category = options?.category ?? 'Personal';
    const targetValue = options?.targetValue ?? 100;
    const currentValue = options?.currentValue ?? 0;
    const unit = options?.unit ?? 'units';

    await page.goto('/dashboard/objectives');
    await page.getByTestId('objective-create-open').click();
    await page.getByTestId('objective-title-input').fill(title);
    await page.getByTestId('objective-description-input').fill(description);
    await page.getByTestId('objective-category-select').click();
    await page.getByRole('option', { name: new RegExp(category, 'i') }).click();
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
 * Helper function to create an organization/team
 * @param page - Playwright page object
 * @param options - Organization options
 */
export async function createOrganization(
    page: Page,
    options?: {
        name?: string;
        slug?: string;
    }
) {
    const uuid = randomUUID();
    const name = options?.name ?? `test-org-${uuid}`;
    const slug = options?.slug ?? `test-org-${uuid}`;

    await page.goto('/dashboard/teams');
    await page.getByTestId('team-create-open').click();
    await page.getByTestId('team-name-input').fill(name);
    await page.getByTestId('team-slug-input').fill(slug);
    await page.getByTestId('team-save-button').click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    return { name, slug };
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
