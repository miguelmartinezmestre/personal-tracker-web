import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function submitOpenDialogForm(page: Page): Promise<void> {
    const submit = page.locator('[role="dialog"] form button[type="submit"]');
    await expect(submit).toBeEnabled();
    await submit.click();
}

export async function saveEditedItemAndWaitForRow(options: {
    page: Page;
    saveButtonTestId: string;
    dialogInput: Locator;
    rowLocator: Locator;
    entityLabel: string;
}): Promise<void> {
    const saveButton = options.page.getByTestId(options.saveButtonTestId);
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(options.dialogInput, 'Saved ' + options.entityLabel).toBeHidden({
        timeout: 10000,
    });
    await expect(options.rowLocator).toBeVisible({ timeout: 10000 });
}
