import { Page, Locator } from '@playwright/test';

export class SettingsPage {
    readonly page: Page;

    // Layout
    readonly settingsPage: Locator;
    readonly tabAccount: Locator;
    readonly tabPassword: Locator;
    readonly tabDanger: Locator;

    // Account form
    readonly usernameInput: Locator;
    readonly emailInput: Locator;
    readonly accountSaveButton: Locator;
    readonly accountCancelButton: Locator;
    readonly accountSuccessMessage: Locator;
    readonly accountErrorMessage: Locator;

    // Password form
    readonly currentPasswordInput: Locator;
    readonly newPasswordInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly passwordSaveButton: Locator;
    readonly passwordCancelButton: Locator;
    readonly passwordSuccessMessage: Locator;
    readonly passwordErrorMessage: Locator;

    // Danger zone
    readonly deleteEmailInput: Locator;
    readonly deletePasswordInput: Locator;
    readonly deleteAccountButton: Locator;
    readonly deleteAccountSuccess: Locator;
    readonly deleteAccountError: Locator;

    constructor(page: Page) {
        this.page = page;

        // Layout
        this.settingsPage = page.getByTestId('settings-page');
        this.tabAccount = page.getByTestId('settings-tab-account');
        this.tabPassword = page.getByTestId('settings-tab-password');
        this.tabDanger = page.getByTestId('settings-tab-danger');

        // Account form
        this.usernameInput = page.getByTestId('account-username-input');
        this.emailInput = page.getByTestId('account-email-input');
        this.accountSaveButton = page.getByTestId('account-save-button');
        this.accountCancelButton = page.getByTestId('account-cancel-button');
        this.accountSuccessMessage = page.getByTestId('account-success-message');
        this.accountErrorMessage = page.getByTestId('account-error-message');

        // Password form
        this.currentPasswordInput = page.getByTestId('password-current-input');
        this.newPasswordInput = page.getByTestId('password-new-input');
        this.confirmPasswordInput = page.getByTestId('password-confirm-input');
        this.passwordSaveButton = page.getByTestId('password-save-button');
        this.passwordCancelButton = page.getByTestId('password-cancel-button');
        this.passwordSuccessMessage = page.getByTestId('password-success-message');
        this.passwordErrorMessage = page.getByTestId('password-error-message');

        // Danger zone
        this.deleteEmailInput = page.getByTestId('delete-account-email-input');
        this.deletePasswordInput = page.getByTestId('delete-account-password-input');
        this.deleteAccountButton = page.getByTestId('delete-account-button');
        this.deleteAccountSuccess = page.getByTestId('delete-account-success');
        this.deleteAccountError = page.getByTestId('delete-account-error');
    }

    async goto() {
        await this.page.goto('/dashboard/settings');
    }

    async switchToAccount() {
        await this.tabAccount.click();
    }

    async switchToPassword() {
        await this.tabPassword.click();
    }

    async switchToDanger() {
        await this.tabDanger.click();
    }

    async fillAccountForm(username: string, email: string) {
        await this.usernameInput.clear();
        await this.usernameInput.fill(username);
        await this.emailInput.clear();
        await this.emailInput.fill(email);
    }

    async fillPasswordForm(currentPassword: string, confirmPassword: string, newPassword: string) {
        await this.currentPasswordInput.fill(currentPassword);
        await this.confirmPasswordInput.fill(confirmPassword);
        await this.newPasswordInput.fill(newPassword);
    }

    async fillDeleteAccountForm(email: string, password: string) {
        await this.deleteEmailInput.fill(email);
        await this.deletePasswordInput.fill(password);
    }
}
