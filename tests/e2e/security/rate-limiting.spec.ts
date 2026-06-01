import { test, expect, type Page } from '@playwright/test';

async function submitLoginAttempt(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();
    await page.waitForTimeout(500);
}

async function submitRegistrationAttempt(
    page: Page,
    values: { username: string; email: string; password: string }
): Promise<void> {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('register-username-input').fill(values.username);
    await page.getByTestId('register-email-input').fill(values.email);
    await page.getByTestId('register-password-input').fill(values.password);
    await page.getByTestId('register-confirm-password-input').fill(values.password);
    await page.getByTestId('register-button').click();
    await page.waitForTimeout(500);
}

async function submitPasswordResetAttempt(page: Page, email: string): Promise<void> {
    await page.goto('/forget-password', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('forgot-password-submit').click();
    await page.waitForTimeout(500);
}

test.describe('Rate Limiting', () => {
    test.describe('Login Rate Limiting', () => {
        test('keeps repeated failed login attempts out of the dashboard', async ({ page }) => {
            const testEmail = `ratelimit-${Date.now()}@example.com`;

            for (let i = 0; i < 10; i++) {
                await submitLoginAttempt(page, testEmail, 'WrongPassword123!');
                expect(page.url()).not.toContain('/dashboard/');
            }

            await expect(page.getByTestId('login-button')).toBeVisible();
        });

        test('keeps the login UI stable during repeated failures', async ({ page }) => {
            const testEmail = `backoff-${Date.now()}@example.com`;

            for (let i = 0; i < 5; i++) {
                await submitLoginAttempt(page, testEmail, 'wrongpassword');
                await expect(page.getByTestId('email-input')).toBeVisible();
            }
        });
    });

    test.describe('Registration Rate Limiting', () => {
        test('handles rapid registration attempts through the form', async ({ browser }) => {
            const batchId = Date.now();

            for (let i = 0; i < 3; i++) {
                const context = await browser.newContext();
                const page = await context.newPage();

                try {
                    await submitRegistrationAttempt(page, {
                        username: `Spam User ${batchId} ${i}`,
                        email: `spam-${batchId}-${i}@example.com`,
                        password: 'Password123!',
                    });

                    expect(page.url()).toMatch(/\/(dashboard\/home|register|login)(\?|$)/);
                } finally {
                    await context.close();
                }
            }
        });
    });

    test.describe('Password Reset Rate Limiting', () => {
        test('handles repeated password reset submissions through the form', async ({ page }) => {
            const testEmail = `reset-${Date.now()}@example.com`;

            for (let i = 0; i < 5; i++) {
                await submitPasswordResetAttempt(page, testEmail);
                expect(page.url()).toContain('/forget-password');
            }
        });
    });

    test.describe('General Navigation Pressure', () => {
        test('handles burst landing page navigation gracefully', async ({ browser }) => {
            const contexts = await Promise.all(
                Array.from({ length: 5 }, async () => {
                    const context = await browser.newContext();
                    const page = await context.newPage();
                    return { context, page };
                })
            );

            try {
                await Promise.all(
                    contexts.map(async ({ page }) => {
                        const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
                        expect(response?.status()).toBeLessThan(500);
                    })
                );
            } finally {
                await Promise.all(contexts.map(({ context }) => context.close()));
            }
        });

        test('recovers after repeated failed login attempts', async ({ page }) => {
            const testEmail = `recover-${Date.now()}@example.com`;

            for (let i = 0; i < 5; i++) {
                await submitLoginAttempt(page, testEmail, 'WrongPassword123!');
            }

            await page.goto('/login', { waitUntil: 'domcontentloaded' });
            await expect(page.getByTestId('login-button')).toBeVisible();
        });
    });
});
