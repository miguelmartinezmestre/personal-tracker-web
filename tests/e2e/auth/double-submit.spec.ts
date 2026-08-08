import { expect, test } from '@playwright/test';
import { generateTestUserData } from '../../helpers/test-helpers';

test(
    'registration prevents duplicate submissions while the request is pending',
    { tag: ['@REQ-AUTENTICACION-001'] },
    async ({ page }) => {
        const user = generateTestUserData();
        await page.goto('/register');

        await page.getByTestId('register-username-input').fill(user.username);
        await page.getByTestId('register-email-input').fill(user.email);
        await page.getByTestId('register-password-input').fill(user.password);
        await page.getByTestId('register-confirm-password-input').fill(user.password);

        const registerButton = page.getByTestId('register-button');
        await registerButton.evaluate(button => {
            const element = button as HTMLButtonElement;
            element.click();
            element.click();
            element.click();
        });

        await expect(registerButton).toBeDisabled();
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    }
);
