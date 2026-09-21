import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function expectOnDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/dashboard\//);
}

export async function expectOnLogin(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
}

export async function expectErrorAlert(page: Page, message?: string | RegExp): Promise<void> {
    const applicationAlert = page
        .locator(
            '[data-slot="alert"], .alert-destructive, [data-testid*="error-message"], [class*="destructive"]'
        )
        .first();

    const errorText = page
        .getByText(
            /error|invalid|incorrect|wrong|failed|already exists|already registered|inválido|incorrecto|falló|ya existe|ya registrado/i
        )
        .first();

    const timeout = Date.now() + 5000;
    let foundError = false;

    while (Date.now() < timeout && !foundError) {
        const hasApplicationAlert = await applicationAlert.isVisible().catch(() => false);
        const hasErrorText = await errorText.isVisible().catch(() => false);
        foundError = hasApplicationAlert || hasErrorText;

        if (!foundError) {
            await page.waitForTimeout(100);
        }
    }

    expect(foundError).toBe(true);

    if (message) {
        if (await applicationAlert.isVisible().catch(() => false)) {
            await expect(applicationAlert).toContainText(message);
        }
    }
}

export async function expectWelcomeMessage(page: Page, username: string): Promise<void> {
    const welcomeMessage = page.getByTestId('welcome-message');
    await expect(welcomeMessage).toContainText(username);
}
