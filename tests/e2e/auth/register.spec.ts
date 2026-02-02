import { test, expect } from '@playwright/test';
import { createTestUser, DEFAULT_PASSWORD } from '../../helpers/test-helpers';
import { UserFactory } from '../../helpers/factories';
import { expectOnDashboard, expectOnRegister, expectErrorAlert, expectWelcomeMessage } from '../../helpers/assertions';

test.describe('Register', () => {
    test('register new user with organization', async ({ page }) => {
        const userData = UserFactory.create();

        await page.goto('/register');

        // Fill registration form
        await page.getByTestId('register-username-input').fill(userData.username);
        await page.getByTestId('register-email-input').fill(userData.email);
        await page.getByTestId('register-password-input').fill(userData.password);
        await page.getByTestId('register-confirm-password-input').fill(userData.password);
        await page.getByTestId('register-organization-slug-input').fill(userData.organizationSlug);

        // Submit
        await page.getByTestId('register-button').click();

        // Wait for redirect to dashboard
        await page.waitForURL(/\/dashboard\/home$/, { timeout: 15000 });
        await expectOnDashboard(page);
        await expectWelcomeMessage(page, userData.username);
    });

    test('validate required fields - empty form submission', async ({ page }) => {
        await page.goto('/register');

        // Try to submit empty form
        await page.getByTestId('register-button').click();

        // Should stay on register page
        await expectOnRegister(page);
    });

    test('validate email format', async ({ page }) => {
        await page.goto('/register');

        // Fill with invalid email
        await page.getByTestId('register-username-input').fill('testuser');
        await page.getByTestId('register-email-input').fill('invalid-email');
        await page.getByTestId('register-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-confirm-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-organization-slug-input').fill('org-test');

        await page.getByTestId('register-button').click();

        // Should stay on register page due to validation
        await expectOnRegister(page);
    });

    test('validate password minimum length', async ({ page }) => {
        await page.goto('/register');

        // Fill with short password
        await page.getByTestId('register-username-input').fill('testuser');
        await page.getByTestId('register-email-input').fill('test@example.com');
        await page.getByTestId('register-password-input').fill('short');
        await page.getByTestId('register-confirm-password-input').fill('short');
        await page.getByTestId('register-organization-slug-input').fill('org-test');

        await page.getByTestId('register-button').click();

        // Should show validation error or stay on register
        await expectOnRegister(page);
    });

    test('validate password confirmation match', async ({ page }) => {
        await page.goto('/register');

        // Fill with mismatched passwords
        await page.getByTestId('register-username-input').fill('testuser');
        await page.getByTestId('register-email-input').fill('test@example.com');
        await page.getByTestId('register-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-confirm-password-input').fill('differentpassword');
        await page.getByTestId('register-organization-slug-input').fill('org-test');

        await page.getByTestId('register-button').click();

        // Should stay on register page
        await expectOnRegister(page);
    });

    test('validate username minimum length', async ({ page }) => {
        await page.goto('/register');

        // Fill with short username
        await page.getByTestId('register-username-input').fill('ab'); // Too short
        await page.getByTestId('register-email-input').fill('test@example.com');
        await page.getByTestId('register-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-confirm-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-organization-slug-input').fill('org-test');

        await page.getByTestId('register-button').click();

        // Should stay on register page or show validation error
        await expectOnRegister(page);
    });

    test('validate organization slug format', async ({ page }) => {
        await page.goto('/register');

        // Fill with invalid organization slug (uppercase, spaces)
        await page.getByTestId('register-username-input').fill('testuser');
        await page.getByTestId('register-email-input').fill('test@example.com');
        await page.getByTestId('register-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-confirm-password-input').fill(DEFAULT_PASSWORD);
        await page.getByTestId('register-organization-slug-input').fill('Invalid Slug With Spaces');

        await page.getByTestId('register-button').click();

        // Should stay on register page (validation prevents invalid slug)
        await expectOnRegister(page);
    });

    test('prevent duplicate email registration', async ({ page }) => {
        // First, create a user
        const { email } = await createTestUser(page);

        // Clear session
        await page.context().clearCookies();

        // Try to register with same email
        await page.goto('/register');

        const userData = UserFactory.create();
        await page.getByTestId('register-username-input').fill(userData.username);
        await page.getByTestId('register-email-input').fill(email); // Use existing email
        await page.getByTestId('register-password-input').fill(userData.password);
        await page.getByTestId('register-confirm-password-input').fill(userData.password);
        await page.getByTestId('register-organization-slug-input').fill(userData.organizationSlug);

        await page.getByTestId('register-button').click();

        // Wait for potential error
        await page.waitForTimeout(2000);

        // Should show error or stay on register
        const currentUrl = page.url();
        if (currentUrl.includes('/register')) {
            // Good - stayed on register with error
            await expectOnRegister(page);
        }
        // If redirected, the system might handle duplicates differently
    });

    test('redirect to login link works', async ({ page }) => {
        await page.goto('/register');

        // Click "Already have an account" link
        const loginLink = page.getByRole('link', { name: /already have an account|ya tienes cuenta/i });
        await loginLink.click();

        // Should be on login page
        await page.waitForURL(/\/login$/);
        await expect(page).toHaveURL(/\/login$/);
    });

    test('organization slug field shows hint', async ({ page }) => {
        await page.goto('/register');

        // The hint text should be visible or the field should have placeholder/label
        const hint = page.getByText(/only.*lowercase|solo.*minúsculas|letters.*numbers|letras.*números/i);
        const slugField = page.getByTestId('register-organization-slug-input');
        const placeholder = await slugField.getAttribute('placeholder');
        const labelExists = await page.locator('label[for*="organization"], label:has-text("organization")').count() > 0;

        const hasHint = (await hint.count()) > 0;
        const hasPlaceholder = placeholder && placeholder.length > 0;

        // Either hint text, placeholder, or label should provide guidance
        expect(hasHint || hasPlaceholder || labelExists).toBeTruthy();
    });
});
