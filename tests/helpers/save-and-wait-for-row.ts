import { expect, Locator, Page } from '@playwright/test';

export async function submitOpenDialogForm(page: Page): Promise<void> {
    await page
        .locator('[role="dialog"] form')
        .evaluate(form => (form as HTMLFormElement).requestSubmit())
        .catch(() => undefined);
}

export async function saveEditedItemAndWaitForRow(options: {
    page: Page;
    saveButtonTestId: string;
    dialogInput: Locator;
    rowLocator: Locator;
    entityLabel: string;
    submitDialog?: (page: Page) => Promise<void>;
    prepareForRowCheck?: (page: Page) => Promise<void>;
    onRetry: (page: Page) => Promise<void>;
}): Promise<void> {
    const submitDialog = options.submitDialog ?? submitOpenDialogForm;
    const saveButton = options.page.getByTestId(options.saveButtonTestId);

    for (let attempt = 0; attempt < 3; attempt++) {
        await expect(saveButton).toBeVisible({ timeout: 10000 });
        await expect(saveButton).toBeEnabled({ timeout: 10000 });
        await submitDialog(options.page);

        try {
            await expect(options.dialogInput).toBeHidden({ timeout: 5000 });
            if (options.prepareForRowCheck) {
                await options.prepareForRowCheck(options.page);
            }
            await expect(options.rowLocator).toBeVisible({ timeout: 10000 });
            return;
        } catch {
            await options.onRetry(options.page);
        }
    }

    throw new Error(`Could not save edited ${options.entityLabel}`);
}
