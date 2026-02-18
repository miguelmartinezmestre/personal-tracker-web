import { Page, Locator } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;
    readonly registerLink: Locator;
    readonly forgotPasswordLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByTestId('email-input');
        this.passwordInput = page.getByTestId('password-input');
        this.loginButton = page.getByTestId('login-button');
        this.registerLink = page.getByRole('link', {
            name: /don't have an account|no tienes cuenta/i,
        });
        this.forgotPasswordLink = page.getByRole('link', { name: /forgot|olvidaste/i });
    }

    async goto() {
        await this.page.goto('/login');
    }

    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }

    async clickRegisterLink() {
        await this.registerLink.click();
    }

    async clickForgotPasswordLink() {
        await this.forgotPasswordLink.click();
    }
}
