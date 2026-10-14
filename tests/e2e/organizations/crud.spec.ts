import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization } from '../../helpers/test-helpers';
import { OrganizationFactory } from '../../helpers/factories';

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function setActiveOrganization(page: Page, orgName: string): Promise<void> {
    const switcher = page.getByTestId('organization-switcher');
    const trigger = switcher.first();

    const retryButton = page.getByRole('button', { name: /try again|reintentar/i });
    if (await retryButton.isVisible()) {
        await retryButton.click();
    }

    await expect(trigger).toBeVisible({ timeout: 15000 });
    await expect(trigger).toBeEnabled({ timeout: 15000 });

    const currentOrganizationText = (await trigger.textContent({ timeout: 2000 }))?.trim() ?? '';
    if (currentOrganizationText.includes(orgName)) {
        return;
    }

    await trigger.click();

    const orgOption = page
        .locator('[data-testid^="organization-option-"]')
        .filter({ hasText: new RegExp(escapeRegExp(orgName), 'i') })
        .first();
    await expect(orgOption).toBeVisible({ timeout: 10000 });
    await expect(orgOption).not.toHaveAttribute('aria-disabled', 'true');

    await orgOption.click();
    await expect(trigger).toContainText(orgName, { timeout: 10000 });
}

test.describe('Organizations CRUD', () => {
    test('create new organization', { tag: ['@REQ-EQUIPOS-001'] }, async ({ page }) => {
        const orgData = OrganizationFactory.create();

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        await expect(page.getByTestId('organizations-title')).toBeVisible({
            timeout: 15000,
        });

        await page.getByTestId('organization-create-open').click();

        await page.getByTestId('organization-name-input').fill(orgData.name);
        await page.getByTestId('organization-description-input').fill(orgData.description);

        await page.getByTestId('organization-save-button').click();

        const createdRow = page.getByTestId('table-row').filter({ hasText: orgData.name }).first();
        await expect(createdRow).toBeVisible({ timeout: 10000 });
        await expect(createdRow).toContainText(orgData.description);
    });

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
        const organizationName =
            (await row.locator('[data-testid="table-cell"]').first().textContent())?.trim() ?? '';
        await setActiveOrganization(page, organizationName);

        const editButton = row.getByTestId('organization-edit-open');

        await expect(editButton).toBeVisible();
        await editButton.click();

        const nameInput = page.getByTestId('organization-edit-name-input');
        await expect(nameInput).toBeVisible({ timeout: 10000 });

        const newName = `Updated Org ${randomUUID().substring(0, 8)}`;
        const newDescription = `Updated description ${randomUUID().substring(0, 8)}`;
        await nameInput.fill(newName);
        await page.getByTestId('organization-edit-description-input').fill(newDescription);

        const saveButton = page.getByTestId('organization-edit-save-button');
        await saveButton.click();

        await expect(nameInput).toBeHidden({ timeout: 10000 });
        const updatedRow = orgTable
            .locator('[data-testid="table-row"]')
            .filter({ hasText: newName })
            .first();
        await expect(updatedRow).toContainText(newDescription, { timeout: 10000 });
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

        const organizationName =
            (await row.locator('[data-testid="table-cell"]').first().textContent())?.trim() ?? '';
        await setActiveOrganization(page, organizationName);

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
        // The dialog closes even when the delete fails, so check the row is gone.
        await expect(row).toHaveCount(0, { timeout: 10000 });
    });

    test('switch active organization', async ({ page }) => {
        const newOrg = await createOrganization(page, {
            name: `Switch Org ${randomUUID().substring(0, 8)}`,
        });

        await page.goto('/dashboard/home');
        await setActiveOrganization(page, newOrg.name);
    });

    test('the only owner cannot leave and stays on the organization', async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Sole Owner Org ${randomUUID().substring(0, 8)}`,
        });
        await page.goto('/dashboard/organizations');
        await setActiveOrganization(page, organization.name);
        const row = page
            .getByTestId('organizations-table')
            .locator('[data-testid="table-row"]')
            .filter({ hasText: organization.name })
            .first();
        await row.getByTestId('organization-detail-link').click();

        // Leaving first switches to the personal organization, then must switch back on failure.
        await page.getByTestId('organization-leave').click();
        await page.getByTestId('delete-confirm-button').click();

        await expect(page.getByTestId('organization-switcher').first()).toContainText(
            organization.name,
            { timeout: 15000 }
        );
        await page.goto('/dashboard/organizations');
        await expect(row).toBeVisible({ timeout: 15000 });
    });

    test('validate organization name required', { tag: ['@REQ-EQUIPOS-001'] }, async ({ page }) => {
        await page.goto('/dashboard/organizations');

        await page.getByTestId('organization-create-open').click();

        const nameInput = page.getByTestId('organization-name-input');
        await nameInput.fill('   ');
        await page.getByTestId('organization-save-button').click();

        await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        await expect(page.locator('[data-slot="field-error"]')).toHaveCount(1);
        await expect(nameInput).toBeVisible();
    });
});
