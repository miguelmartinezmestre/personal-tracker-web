import { Page, expect } from '@playwright/test';

/**
 * Custom assertions for the test suite.
 */

/**
 * Asserts that the user is on the dashboard.
 */
export async function expectOnDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/dashboard\//);
}

/**
 * Asserts that the user is on the login page.
 */
export async function expectOnLogin(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/login$/);
}

/**
 * Asserts that the user is on the register page.
 */
export async function expectOnRegister(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/register$/);
}

/**
 * Asserts that an error alert is visible.
 */
export async function expectErrorAlert(page: Page, message?: string | RegExp): Promise<void> {
    // Wait a bit for error to appear
    await page.waitForTimeout(1000);

    const alert = page.locator(
        '[role="alert"], .alert-destructive, [data-slot="alert"], [class*="error"], [class*="destructive"]'
    );
    const errorText = page.getByText(
        /error|invalid|incorrect|wrong|failed|inválido|incorrecto|falló/i
    );

    const hasAlert = (await alert.count()) > 0;
    const hasErrorText = (await errorText.count()) > 0;

    expect(hasAlert || hasErrorText).toBeTruthy();

    if (message && hasAlert) {
        await expect(alert.first()).toContainText(message);
    }
}

/**
 * Asserts that the welcome message contains the username.
 */
export async function expectWelcomeMessage(page: Page, username: string): Promise<void> {
    const welcomeMessage = page.getByTestId('welcome-message');
    await expect(welcomeMessage).toContainText(username);
}

/**
 * Asserts that the admin menu is visible (user is admin).
 */
export async function expectAdminMenuVisible(page: Page): Promise<void> {
    const adminMenuItem = page.locator('a[href*="admin"], [data-testid*="admin"]').first();
    await expect(adminMenuItem).toBeVisible();
}

/**
 * Asserts that the admin menu is not visible (user is not admin).
 */
export async function expectAdminMenuHidden(page: Page): Promise<void> {
    const adminMenuItem = page.locator('a[href*="admin"], [data-testid*="admin"]');
    await expect(adminMenuItem).toHaveCount(0);
}

