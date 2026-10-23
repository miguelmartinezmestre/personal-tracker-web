import { test, expect, type Page } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';
import { expectOnDashboard, expectErrorAlert } from '../../helpers/assertions';

async function fillRegistrationForm(page: Page, user = UserFactory.create()) {
    await page.getByTestId('register-username-input').fill(user.username);
    await page.getByTestId('register-email-input').fill(user.email);
    await page.getByTestId('register-password-input').fill(user.password);
    await page.getByTestId('register-confirm-password-input').fill(user.password);

    return user;
}

test.describe('User Registration', () => {
    test(
        'successful registration with email/password',
        {
            tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-005'],
        },
        async ({ page }) => {
            await page.goto('/register');
            await fillRegistrationForm(page);
            await page.getByTestId('register-button').click();

            await page.getByTestId('register-categories-skip').click({ timeout: 30000 });
            await page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: 'domcontentloaded' });
            await expectOnDashboard(page);
        }
    );

    test(
        'invalid registration input stays on the form',
        {
            tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-005'],
        },
        async ({ page }) => {
            const user = UserFactory.create();

            await page.goto('/register');
            await page.getByTestId('register-username-input').fill(user.username);
            await page.getByTestId('register-email-input').fill('not-an-email');
            await page.getByTestId('register-password-input').fill(user.password);
            await page.getByTestId('register-confirm-password-input').fill(user.password);
            await page.getByTestId('register-button').click();

            await expect(page).toHaveURL(/\/register/);
            await expect(page.getByTestId('register-email-input')).toHaveAttribute(
                'aria-invalid',
                'true'
            );
            await expect(
                page
                    .getByTestId('register-email-input')
                    .locator('xpath=following-sibling::div[@data-slot="field-error"]')
            ).toContainText(/email|correo/i);
        }
    );

    test(
        'required registration fields expose validation messages',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-005'] },
        async ({ page }) => {
            await page.goto('/register');
            await page.getByTestId('register-button').click();

            for (const testId of [
                'register-username-input',
                'register-email-input',
                'register-password-input',
                'register-confirm-password-input',
            ]) {
                await expect(page.getByTestId(testId)).toHaveAttribute('aria-invalid', 'true');
            }

            await expect(page.locator('[data-slot="field-error"]')).toHaveCount(4);
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'weak passwords show the password policy message',
        { tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-005', '@security'] },
        async ({ page }) => {
            const user = UserFactory.create({ password: 'weakpass' });

            await page.goto('/register');
            await fillRegistrationForm(page, user);
            await page.getByTestId('register-button').click();

            await expect(page.getByTestId('register-password-input')).toHaveAttribute(
                'aria-invalid',
                'true'
            );
            await expect(page.locator('[data-slot="field-error"]')).toContainText(
                /mayúscula|uppercase/i
            );
            await expect(page).toHaveURL(/\/register/);
        }
    );

    test(
        'duplicate email shows error',
        {
            tag: ['@REQ-AUTENTICACION-001', '@REQ-NF-005'],
        },
        async ({ page }) => {
            await page.goto('/register');
            const user = await fillRegistrationForm(page);
            await page.getByTestId('register-button').click();
            await expect(page.getByTestId('register-categories-step')).toBeVisible({
                timeout: 30000,
            });

            await page.context().clearCookies();
            await page.goto('/register');

            await fillRegistrationForm(page, UserFactory.create({ email: user.email }));
            await page.getByTestId('register-button').click();

            await expectErrorAlert(page);
            await expect(
                page
                    .getByRole('alert')
                    .filter({
                        hasText: /already exists|already registered|ya existe|ya registrado/i,
                    })
                    .first()
            ).toBeVisible();
        }
    );
});
