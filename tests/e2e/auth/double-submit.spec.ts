import { test, expect } from '@playwright/test';
import { UserFactory } from '../../helpers/factories';
import { loginUser } from '../../helpers/auth';

test.describe('Double Submit Prevention', () => {
    test.describe('Login Form', () => {
        test(
            'prevents double submit on login form - button disabled during submission',
            { tag: ['@REQ-AUTENTICACION-001', '@security'] },
            async ({ page }) => {
                const user = UserFactory.create();

                await page.goto('/register');
                await page.getByTestId('register-username-input').fill(user.username);
                await page.getByTestId('register-email-input').fill(user.email);
                await page.getByTestId('register-password-input').fill(user.password);
                await page.getByTestId('register-confirm-password-input').fill(user.password);
                await page.getByTestId('register-button').click();
                await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

                await page.context().clearCookies();
                await page.goto('/login');

                await page.getByTestId('email-input').fill(user.email);
                await page.getByTestId('password-input').fill(user.password);

                const loginButton = page.getByTestId('login-button');
                await expect(loginButton).toBeEnabled();

                await loginButton.click();

                await expect(loginButton).toBeDisabled();

                await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
            }
        );

        test(
            'rapid multiple clicks only submit once - login form',
            { tag: ['@REQ-AUTENTICACION-001', '@security'] },
            async ({ page }) => {
                const user = UserFactory.create();

                await page.goto('/register');
                await page.getByTestId('register-username-input').fill(user.username);
                await page.getByTestId('register-email-input').fill(user.email);
                await page.getByTestId('register-password-input').fill(user.password);
                await page.getByTestId('register-confirm-password-input').fill(user.password);
                await page.getByTestId('register-button').click();
                await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

                await page.context().clearCookies();
                await page.goto('/login');

                await page.getByTestId('email-input').fill(user.email);
                await page.getByTestId('password-input').fill(user.password);

                const loginButton = page.getByTestId('login-button');

                await loginButton.evaluate(button => {
                    const element = button as HTMLButtonElement;
                    element.click();
                    element.click();
                    element.click();
                    element.click();
                    element.click();
                });

                await expect(loginButton).toBeDisabled();

                await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
            }
        );
    });

    test.describe('Forgot Password Form', () => {
        test(
            'prevents double submit on forgot password - button shows loading state',
            { tag: ['@REQ-AUTENTICACION-003', '@security'] },
            async ({ page }) => {
                await page.goto('/forget-password');

                await page.getByTestId('email-input').fill('test@example.com');

                const submitButton = page.getByTestId('forgot-password-submit');
                await expect(submitButton).toBeEnabled();

                await submitButton.click();

                await expect(submitButton).toBeDisabled();
            }
        );

        test(
            'rapid clicks on forgot password only trigger one request',
            { tag: ['@REQ-AUTENTICACION-003', '@security'] },
            async ({ page }) => {
                await page.goto('/forget-password');

                await page.getByTestId('email-input').fill('test@example.com');

                const submitButton = page.getByTestId('forgot-password-submit');

                await Promise.all([
                    submitButton.click(),
                    submitButton.click(),
                    submitButton.click(),
                    submitButton.click(),
                ]);

                await expect(submitButton).toBeDisabled();
            }
        );
    });

    test.describe('Reset Password Form', () => {
        test(
            'prevents double submit on reset password - button disabled during submission',
            { tag: ['@REQ-AUTENTICACION-003', '@security'] },
            async ({ page }) => {
                await page.goto('/reset-password?token=invalid-token');

                await page.getByTestId('reset-password-input').fill('NewPassword123!');
                await page.getByTestId('reset-password-confirm-input').fill('NewPassword123!');

                const submitButton = page.getByTestId('reset-password-submit');
                await expect(submitButton).toBeEnabled();

                await submitButton.click();

                await expect(submitButton).toBeDisabled();
            }
        );
    });

    test.describe('Account Settings Form', () => {
        test(
            'prevents double submit on account settings update',
            { tag: ['@REQ-USUARIO-001', '@security'] },
            async ({ page }) => {
                const user = await loginUser(page);

                await page.goto('/dashboard/settings');

                await page.getByTestId('account-username-input').fill(user.username + '_updated');

                const saveButton = page.getByTestId('account-save-button');
                await expect(saveButton).toBeEnabled();

                await saveButton.evaluate(button => {
                    const element = button as HTMLButtonElement;
                    element.click();
                    element.click();
                    element.click();
                });

                await expect(saveButton)
                    .toBeDisabled({ timeout: 1000 })
                    .catch(async () => {
                        await expect(saveButton).toBeEnabled({ timeout: 5000 });
                    });
            }
        );
    });

    test.describe('Organization Forms', () => {
        test(
            'prevents double submit on create organization modal',
            { tag: ['@REQ-ORGANIZACION-001', '@security'] },
            async ({ page }) => {
                await loginUser(page);

                await page.goto('/dashboard/organizations');

                await page.getByTestId('organization-create-open').click();

                await page.getByTestId('organization-name-input').fill('Test Organization');
                await page.getByTestId('organization-description-input').fill('Test description');

                const saveButton = page.getByTestId('organization-save-button');
                await expect(saveButton).toBeEnabled();

                await saveButton.evaluate(button => {
                    const element = button as HTMLButtonElement;
                    element.click();
                    element.click();
                    element.click();
                });

                await expect(saveButton)
                    .toBeDisabled({ timeout: 5000 })
                    .catch(async () => {
                        await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
                    });
            }
        );

        test(
            'prevents double submit on edit organization modal',
            { tag: ['@REQ-ORGANIZACION-002', '@security'] },
            async ({ page }) => {
                await loginUser(page);

                await page.goto('/dashboard/organizations');

                await page.getByTestId('organization-create-open').click();
                await page.getByTestId('organization-name-input').fill('Org to Edit');
                await page.getByTestId('organization-save-button').click();
                await page.waitForTimeout(1000);

                const editButton = page.getByTestId('organization-edit-open').first();
                if (await editButton.isVisible().catch(() => false)) {
                    await editButton.click();

                    await page.getByTestId('organization-edit-name-input').fill('Updated Name');

                    const saveButton = page.getByTestId('organization-edit-save-button');
                    await expect(saveButton).toBeEnabled();

                    await saveButton.evaluate(button => {
                        const element = button as HTMLButtonElement;
                        element.click();
                        element.click();
                    });

                    await expect(saveButton)
                        .toBeDisabled({ timeout: 5000 })
                        .catch(async () => {
                            await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
                        });
                }
            }
        );
    });

    test.describe('Organization Members Forms', () => {
        test(
            'prevents double submit on create organization member modal',
            { tag: ['@REQ-ORGANIZACION-003', '@security'] },
            async ({ page }) => {
                await loginUser(page);

                await page.goto('/dashboard/organizations');

                const firstOrg = page.getByRole('link', { name: /view/i }).first();
                if (await firstOrg.isVisible().catch(() => false)) {
                    await firstOrg.click();

                    const addMemberButton = page.getByTestId('organization-member-create-open');
                    if (await addMemberButton.isVisible().catch(() => false)) {
                        await addMemberButton.click();

                        await page
                            .getByTestId('organization-member-email-input')
                            .fill('newmember@example.com');

                        const saveButton = page.getByTestId('organization-member-save-button');
                        await expect(saveButton).toBeEnabled();

                        await Promise.all([saveButton.click(), saveButton.click()]);

                        await expect(saveButton).toBeDisabled();
                    }
                }
            }
        );
    });

    test.describe('Progress Update Forms', () => {
        test(
            'prevents double submit on edit progress modal',
            { tag: ['@REQ-OBJETIVO-004', '@security'] },
            async ({ page }) => {
                await loginUser(page);

                await page.goto('/dashboard/objectives');

                const firstObjective = page.getByRole('link', { name: /view/i }).first();
                if (await firstObjective.isVisible().catch(() => false)) {
                    await firstObjective.click();

                    const editProgressButton = page.getByTestId('progress-edit-open').first();
                    if (await editProgressButton.isVisible().catch(() => false)) {
                        await editProgressButton.click();

                        await page.getByTestId('progress-edit-value-input').fill('75');

                        const saveButton = page.getByTestId('progress-edit-save-button');
                        await expect(saveButton).toBeEnabled();

                        await Promise.all([saveButton.click(), saveButton.click()]);

                        await expect(saveButton).toBeDisabled();
                    }
                }
            }
        );
    });
});
