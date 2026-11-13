import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization } from '../../helpers/test-helpers';

test.describe('Organizations CRUD', () => {
    test('edit organization name', { tag: ['@REQ-EQUIPOS-007'] }, async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Edit Org ${randomUUID().substring(0, 8)}`,
        });

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgTable = page.getByTestId('organizations-table');

        const row = orgTable
            .locator('[data-testid="table-row"]')
            .filter({ hasText: organization.name })
            .first();

        await expect(row).toBeVisible({ timeout: 10000 });

        const editButton = row.getByTestId('organization-edit-open');

        await expect(editButton).toBeVisible();
        await editButton.click();

        const nameInput = page.getByTestId('organization-edit-name-input');
        await expect(nameInput).toBeVisible({ timeout: 10000 });

        const newName = `Updated Org ${randomUUID().substring(0, 8)}`;
        await nameInput.fill(newName);

        const saveButton = page.getByTestId('organization-edit-save-button');
        await saveButton.click();

        await expect(nameInput).toBeHidden({ timeout: 10000 });

        const updatedRow = orgTable
            .locator('[data-testid="table-row"]')
            .filter({ hasText: newName })
            .first();

        await expect(updatedRow).toBeVisible({ timeout: 10000 });
    });

    test('delete organization', { tag: ['@REQ-EQUIPOS-008', '@REQ-NF-011'] }, async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Delete Org ${randomUUID().substring(0, 8)}`,
        });

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgTable = page.getByTestId('organizations-table');

        const row = orgTable
            .locator('[data-testid="table-row"]')
            .filter({ hasText: organization.name })
            .first();

        await expect(row).toBeVisible();

        const deleteButton = row.getByTestId('organization-delete-button');

        await expect(deleteButton).toBeVisible();
        await deleteButton.click();

        const confirmDialog = page.locator(
            '[data-slot="alert-dialog-content"], [role="alertdialog"]'
        );

        const activeDialog = confirmDialog.first();
        await expect(activeDialog).toBeVisible({ timeout: 5000 });

        const confirmButton = activeDialog.getByTestId('delete-confirm-button');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        await expect(confirmDialog.first()).toBeHidden({ timeout: 10000 });
        await expect(row).toHaveCount(0, { timeout: 10000 });
    });

    test(
        'the only owner cannot leave and stays on the organization',
        { tag: ['@REQ-EQUIPOS-003'] },
        async ({ page }) => {
            const organization = await createOrganization(page, {
                name: `Sole Owner Org ${randomUUID().substring(0, 8)}`,
            });

            await page
                .getByTestId('organizations-table')
                .getByTestId('table-row')
                .filter({ hasText: organization.name })
                .getByTestId('organization-detail-link')
                .click();

            await page.getByTestId('organization-leave').click();
            await page.getByTestId('delete-confirm-button').click();

            await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText(
                /only owner/i,
                { timeout: 15000 }
            );
            await expect(page.getByTestId('organization-switcher').first()).toContainText(
                organization.name,
                { timeout: 15000 }
            );
        }
    );
});
