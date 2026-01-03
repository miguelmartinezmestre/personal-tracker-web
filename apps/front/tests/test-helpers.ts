import { Page, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

export async function createTestUser(page: Page) {
    const uuid = randomUUID();
    const username = `usernametest-${uuid}`;
    const email = `useremail-${uuid}@useremail.com`;

    await page.goto('/register');

    // Wait for form to be ready
    await page.waitForSelector('[data-testid="register-username-input"]');

    // Fill form fields
    await page.getByTestId('register-username-input').fill(username);
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('12345678');
    await page.getByTestId('register-confirm-password-input').fill('12345678');

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
        await page.getByTestId('password-input').fill('12345678');

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

    return { username, email };
}

export async function loginUser(page: Page, email: string, password: string = '12345678') {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/dashboard\/home$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/home$/);
}

/**
 * Helper function to take organized screenshots for TFG documentation
 * @param page - Playwright page object
 * @param testName - Name of the test (will be sanitized for filename)
 * @param step - Description of the step being captured
 * @param suffix - Optional suffix for the filename
 */
export async function takeScreenshot(page: Page, testName: string, step: string, suffix?: string) {
    // Sanitize test name and step for filename
    const sanitize = (str: string) =>
        str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    const testNameClean = sanitize(testName);
    const stepClean = sanitize(step);
    const suffixClean = suffix ? `-${sanitize(suffix)}` : '';

    const filename = `test-results/screenshots/${testNameClean}-${stepClean}${suffixClean}.png`;
    await page.screenshot({
        path: filename,
        fullPage: true,
        animations: 'disabled', // Disable animations for consistent screenshots
    });
}
