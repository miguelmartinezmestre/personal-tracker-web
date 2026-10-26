import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function expectOnDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/dashboard\//);
}

export async function expectOnLogin(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
}

export async function expectErrorAlert(page: Page, message?: string | RegExp): Promise<void> {
    const errorAlert = page.locator('[data-slot="alert"][class*="text-destructive"]').first();
    await expect(errorAlert).toBeVisible();

    if (message) {
        await expect(errorAlert).toContainText(message);
    }
}

export async function expectWelcomeMessage(page: Page, username: string): Promise<void> {
    const welcomeMessage = page.getByTestId('welcome-message');
    await expect(welcomeMessage).toContainText(username);
}
