import { Page, Locator } from '@playwright/test';

export class SettingsPage {
    readonly page: Page;
    readonly settingsPage: Locator;
    readonly tabAccount: Locator;
    readonly tabNotifications: Locator;
    readonly tabPassword: Locator;
    readonly tabDanger: Locator;
    readonly usernameInput: Locator;
    readonly emailInput: Locator;
    readonly accountSaveButton: Locator;
    readonly accountCancelButton: Locator;
    readonly accountSuccessMessage: Locator;
    readonly accountErrorMessage: Locator;
    readonly currentPasswordInput: Locator;
    readonly newPasswordInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly passwordSaveButton: Locator;
    readonly passwordCancelButton: Locator;
    readonly passwordSuccessMessage: Locator;
    readonly passwordErrorMessage: Locator;
    readonly deleteEmailInput: Locator;
    readonly deletePasswordInput: Locator;
    readonly deleteAccountButton: Locator;
    readonly deleteAccountError: Locator;

    constructor(page: Page) {
        this.page = page;
        this.settingsPage = page.getByTestId('settings-page');
        this.tabAccount = page.getByTestId('settings-tab-account');
        this.tabNotifications = page.getByTestId('settings-tab-notifications');
        this.tabPassword = page.getByTestId('settings-tab-password');
        this.tabDanger = page.getByTestId('settings-tab-danger');
        this.usernameInput = page.getByTestId('account-username-input');
        this.emailInput = page.getByTestId('account-email-input');
        this.accountSaveButton = page.getByTestId('account-save-button');
        this.accountCancelButton = page.getByTestId('account-cancel-button');
        this.accountSuccessMessage = page.getByTestId('account-success-message');
        this.accountErrorMessage = page.getByTestId('account-error-message');
        this.currentPasswordInput = page.getByTestId('password-current-input');
        this.newPasswordInput = page.getByTestId('password-new-input');
        this.confirmPasswordInput = page.getByTestId('password-confirm-input');
        this.passwordSaveButton = page.getByTestId('password-save-button');
        this.passwordCancelButton = page.getByTestId('password-cancel-button');
        this.passwordSuccessMessage = page.getByTestId('password-success-message');
        this.passwordErrorMessage = page.getByTestId('password-error-message');
        this.deleteEmailInput = page.getByTestId('delete-account-email-input');
        this.deletePasswordInput = page.getByTestId('delete-account-password-input');
        this.deleteAccountButton = page.getByTestId('delete-account-button');
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

    async fillPasswordForm(currentPassword: string, newPassword: string, confirmPassword: string) {
        await this.currentPasswordInput.fill(currentPassword);
        await this.newPasswordInput.fill(newPassword);
        await this.confirmPasswordInput.fill(confirmPassword);
    }

    async fillDeleteAccountForm(email: string, password: string) {
        await this.deleteEmailInput.fill(email);
        await this.deletePasswordInput.fill(password);
    }
}
