import { test, expect, type Locator } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';
import { expectOnDashboard, expectOnLogin, expectErrorAlert } from '../../helpers/assertions';

async function fillAndAssert(locator: Locator, value: string): Promise<void> {
    await locator.click();
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
}

test.describe('User Registration', () => {
    test(
        'successful registration with email/password',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await fillAndAssert(page.getByTestId('register-username-input'), user.username);
            await fillAndAssert(page.getByTestId('register-email-input'), user.email);
            await fillAndAssert(page.getByTestId('register-password-input'), user.password);
            await fillAndAssert(page.getByTestId('register-confirm-password-input'), user.password);
            await page.getByTestId('register-button').click();

            await page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: 'domcontentloaded' });
            await expectOnDashboard(page);
        }
    );

    test(
        'validation: username is required',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: email must be valid',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill('not-an-email');
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: password must be at least 8 characters',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill('short');
            await page.getByTestId('register-confirm-password-input').fill('short');
            await page.getByTestId('register-button').click();

            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: weak password is rejected',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill('12345678');
            await page.getByTestId('register-confirm-password-input').fill('12345678');
            await page.getByTestId('register-button').click();

            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'validation: passwords must match',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill(user.email);
            await page.getByTestId('register-password-input').fill('password123');
            await page.getByTestId('register-confirm-password-input').fill('differentpassword');
            await page.getByTestId('register-button').click();

            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'duplicate email shows error',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await fillAndAssert(page.getByTestId('register-username-input'), user.username);
            await fillAndAssert(page.getByTestId('register-email-input'), user.email);
            await fillAndAssert(page.getByTestId('register-password-input'), user.password);
            await fillAndAssert(page.getByTestId('register-confirm-password-input'), user.password);
            await page.getByTestId('register-button').click();
            await page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: 'domcontentloaded' });

            await page.context().clearCookies();
            await page.goto('/register');

            const secondUser = UserFactory.create({ email: user.email });
            await fillAndAssert(page.getByTestId('register-username-input'), secondUser.username);
            await fillAndAssert(page.getByTestId('register-email-input'), user.email);
            await fillAndAssert(page.getByTestId('register-password-input'), secondUser.password);
            await fillAndAssert(
                page.getByTestId('register-confirm-password-input'),
                secondUser.password
            );
            await page.getByTestId('register-button').click();

            await expectErrorAlert(page);
        }
    );

    test(
        'after registration navigates to dashboard',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await fillAndAssert(page.getByTestId('register-username-input'), user.username);
            await fillAndAssert(page.getByTestId('register-email-input'), user.email);
            await fillAndAssert(page.getByTestId('register-password-input'), user.password);
            await fillAndAssert(page.getByTestId('register-confirm-password-input'), user.password);
            await page.getByTestId('register-button').click();

            await page.waitForURL(/\/dashboard\/home/, {
                timeout: 30000,
                waitUntil: 'domcontentloaded',
            });
            await expect(page).toHaveURL(/\/dashboard\/home$/);
        }
    );

    test(
        'link to login page works',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-006', '@cross-browser'] },
        async ({ page }) => {
            await page.goto('/register');

            const loginLink = page.getByRole('link', { name: /already have|ya tienes/i });
            await expect(loginLink).toBeVisible();
            await loginLink.click();

            await expectOnLogin(page);
        }
    );
});
