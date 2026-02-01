import { Page, expect, Locator } from '@playwright/test';

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

    const alert = page.locator('[role="alert"], .alert-destructive, [data-slot="alert"], [class*="error"], [class*="destructive"]');
    const errorText = page.getByText(/error|invalid|incorrect|wrong|failed|inválido|incorrecto|falló/i);

    const hasAlert = (await alert.count()) > 0;
    const hasErrorText = (await errorText.count()) > 0;

    expect(hasAlert || hasErrorText).toBeTruthy();

    if (message && hasAlert) {
        await expect(alert.first()).toContainText(message);
    }
}

/**
 * Asserts that a success toast is visible.
 */
export async function expectSuccessToast(page: Page, message?: string | RegExp): Promise<void> {
    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5000 });
    if (message) {
        await expect(toast.first()).toContainText(message);
    }
}

/**
 * Asserts that a toast with specific message is visible.
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
    const toast = page.locator('[data-sonner-toast]', { hasText: message });
    await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * Asserts that a table row with specific text exists.
 */
export async function expectTableRow(page: Page, text: string): Promise<Locator> {
    const row = page.locator('tr', { hasText: text }).first();
    await expect(row).toBeVisible();
    return row;
}

/**
 * Asserts that a table row with specific text does not exist.
 */
export async function expectNoTableRow(page: Page, text: string): Promise<void> {
    const row = page.locator('tr', { hasText: text });
    await expect(row).toHaveCount(0);
}

/**
 * Asserts that a modal/dialog is visible.
 */
export async function expectModalVisible(page: Page): Promise<void> {
    const modal = page.locator('[role="dialog"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"]');
    await expect(modal.first()).toBeVisible();
}

/**
 * Asserts that a modal/dialog is hidden.
 */
export async function expectModalHidden(page: Page): Promise<void> {
    const modal = page.locator('[role="dialog"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"]');
    await expect(modal).toHaveCount(0);
}

/**
 * Asserts that a form field has a validation error.
 */
export async function expectFieldError(page: Page, fieldTestId: string): Promise<void> {
    const field = page.getByTestId(fieldTestId);
    const errorMessage = field.locator('..').locator('[class*="text-destructive"], [class*="error"]');
    await expect(errorMessage.first()).toBeVisible();
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

/**
 * Asserts that a specific number of items exist in a list/table.
 */
export async function expectItemCount(locator: Locator, count: number): Promise<void> {
    await expect(locator).toHaveCount(count);
}

/**
 * Asserts that loading is complete (no spinners).
 */
export async function expectLoadingComplete(page: Page): Promise<void> {
    const spinner = page.locator('[class*="spinner"], [class*="loading"], [data-loading="true"]');
    await expect(spinner).toHaveCount(0);
}

/**
 * Asserts that an element is disabled.
 */
export async function expectDisabled(locator: Locator): Promise<void> {
    await expect(locator).toBeDisabled();
}

/**
 * Asserts that an element is enabled.
 */
export async function expectEnabled(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled();
}

/**
 * Asserts that a badge/status indicator shows specific text.
 */
export async function expectBadge(page: Page, text: string | RegExp): Promise<void> {
    const badge = page.locator('[class*="badge"]', { hasText: text });
    await expect(badge.first()).toBeVisible();
}

/**
 * Asserts that the page has a specific title.
 */
export async function expectPageTitle(page: Page, title: string | RegExp): Promise<void> {
    await expect(page).toHaveTitle(title);
}

/**
 * Asserts that an objective with specific title exists in the list.
 */
export async function expectObjectiveInList(page: Page, title: string): Promise<Locator> {
    return expectTableRow(page, title);
}

/**
 * Asserts that a category exists in the list.
 */
export async function expectCategoryInList(page: Page, name: string): Promise<void> {
    await expect(page.getByText(name)).toBeVisible();
}

/**
 * Asserts that an organization exists in the list.
 */
export async function expectOrganizationInList(page: Page, name: string): Promise<void> {
    await expect(page.getByText(name)).toBeVisible();
}

/**
 * Asserts that a notification exists in the list.
 */
export async function expectNotificationInList(page: Page, message: string): Promise<void> {
    await expect(page.getByText(message)).toBeVisible();
}

/**
 * Asserts progress value is displayed.
 */
export async function expectProgressValue(page: Page, value: number): Promise<void> {
    await expect(page.getByText(String(value))).toBeVisible();
}

/**
 * Asserts that the sidebar is visible.
 */
export async function expectSidebarVisible(page: Page): Promise<void> {
    const sidebar = page.locator('[data-sidebar="sidebar"], aside, nav').first();
    await expect(sidebar).toBeVisible();
}

/**
 * Asserts empty state is shown.
 */
export async function expectEmptyState(page: Page): Promise<void> {
    const emptyState = page.locator('[data-testid="empty-state"], [class*="empty"]');
    await expect(emptyState.first()).toBeVisible();
}
