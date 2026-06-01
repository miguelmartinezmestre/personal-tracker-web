import { Page, expect } from '@playwright/test';

export async function expectOnDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/dashboard\//);
}

export async function expectOnLogin(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
}

export async function expectOnRegister(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/register$/);
}

export async function expectErrorAlert(page: Page, message?: string | RegExp): Promise<void> {
    const alert = page
        .locator(
            '[role="alert"], .alert-destructive, [data-slot="alert"], [class*="error"], [class*="destructive"]'
        )
        .first();

    const errorText = page
        .getByText(/error|invalid|incorrect|wrong|failed|inválido|incorrecto|falló/i)
        .first();

    const timeout = Date.now() + 5000;
    let foundError = false;

    while (Date.now() < timeout && !foundError) {
        const hasAlert = await alert.isVisible().catch(() => false);
        const hasErrorText = await errorText.isVisible().catch(() => false);
        foundError = hasAlert || hasErrorText;

        if (!foundError) {
            await page.waitForTimeout(100);
        }
    }

    expect(foundError).toBe(true);

    if (message) {
        const hasAlert = await alert.isVisible().catch(() => false);
        if (hasAlert) {
            await expect(alert).toContainText(message);
        }
    }
}

export async function expectWelcomeMessage(page: Page, username: string): Promise<void> {
    const welcomeMessage = page.getByTestId('welcome-message');
    await expect(welcomeMessage).toContainText(username);
}

export async function expectAdminMenuVisible(page: Page): Promise<void> {
    const adminNavLink = page.getByRole('navigation').getByRole('link', { name: /admin/i });
    const adminMenuItem = page.locator('a[href*="admin"], [data-testid*="admin"]').first();

    try {
        await expect(adminNavLink).toBeVisible({ timeout: 15000 });
    } catch {
        await expect(adminMenuItem).toBeVisible({ timeout: 15000 });
    }
}

export async function expectAdminMenuHidden(page: Page): Promise<void> {
    const adminNavLink = page.getByRole('navigation').getByRole('link', { name: /admin/i });
    const adminMenuItem = page.locator('a[href*="admin"], [data-testid*="admin"]');

    const navCount = await adminNavLink.count();
    const itemCount = await adminMenuItem.count();

    expect(navCount + itemCount).toBe(0);
}
