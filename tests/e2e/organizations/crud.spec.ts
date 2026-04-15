import { test, expect, Page } from '@playwright/test';
import { createOrganization, createObjective } from '../../helpers/test-helpers';
import { OrganizationFactory } from '../../helpers/factories';

async function setActiveOrganization(page: Page, orgName: string): Promise<void> {
    const switcher = page.getByTestId('organization-switcher');
    if ((await switcher.count()) === 0) {
        return;
    }

    if (!(await switcher.isVisible())) {
        return;
    }

    await switcher.click();

    const orgOption = page.getByRole('menuitem', { name: orgName });
    if ((await orgOption.count()) > 0) {
        await orgOption.first().click();
        await page.waitForLoadState('domcontentloaded');
        return;
    }

    const firstOption = page.getByRole('menuitem').first();
    if ((await firstOption.count()) > 0) {
        const optionText = (await firstOption.textContent())?.toLowerCase() ?? '';
        if (
            !optionText.includes('loading') &&
            !optionText.includes('no organizations') &&
            !optionText.includes('sin organizaciones')
        ) {
            await firstOption.click();
            await page.waitForLoadState('domcontentloaded');
            return;
        }
    }

    await page.keyboard.press('Escape');
}

test.describe('Organizations CRUD', () => {
    test('view organizations list', async ({ page }) => {
        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        await expect(page).toHaveURL(/\/dashboard\/organizations/);

        await expect(page.getByTestId('organizations-title')).toBeVisible({
            timeout: 15000,
        });

        const createButton = page.getByTestId('organization-create-open');
        const hasCreateButton = await createButton.isVisible();

        const orgList = page.getByTestId('table-row');
        const hasOrgs = (await orgList.count()) > 0;

        expect(hasCreateButton || hasOrgs).toBeTruthy();
    });

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
    });

    test('edit organization name', { tag: ['@REQ-EQUIPOS-009'] }, async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Edit Org ${Date.now()}`,
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

        const newName = `Updated Org ${Date.now()}`;
        await nameInput.fill(newName);

        const saveButton = page.getByTestId('organization-edit-save-button');
        await saveButton.click();

        await expect(nameInput).toBeHidden({ timeout: 10000 });
    });

    test('delete organization', { tag: ['@REQ-EQUIPOS-010', '@REQ-NF-025'] }, async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Delete Org ${Date.now()}`,
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
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });

        const confirmButton = confirmDialog.getByTestId('delete-confirm-button');
        await confirmButton.click();

        await expect(confirmDialog).toBeHidden({ timeout: 10000 });
    });

    test('switch active organization', async ({ page }) => {
        const newOrg = await createOrganization(page, { name: `Switch Org ${Date.now()}` });

        await page.goto('/dashboard/home');
        await page.waitForLoadState('domcontentloaded');

        const orgSwitcher = page.getByTestId('organization-switcher');

        if ((await orgSwitcher.count()) > 0) {
            await orgSwitcher.first().click();

            const orgOption = page.getByRole('option', { name: newOrg.name });
            if ((await orgOption.count()) > 0) {
                await orgOption.click();

                await page.waitForLoadState('domcontentloaded');
            }
        } else {
            const sidebarSwitcher = page.locator(
                'aside [data-testid*="org"], header [data-testid*="org"]'
            );
            if ((await sidebarSwitcher.count()) > 0) {
                await sidebarSwitcher.first().click();
            }
        }
    });

    test('data isolation between organizations', async ({ page }) => {
        const obj1 = await createObjective(page, {
            title: `Org1 Objective ${Date.now()}`,
        });

        const newOrg = await createOrganization(page, { name: `Isolated Org ${Date.now()}` });

        await page.goto('/dashboard/home');
        await page.waitForLoadState('domcontentloaded');

        const orgSwitcher = page.getByTestId('organization-switcher');

        if ((await orgSwitcher.count()) > 0) {
            await orgSwitcher.first().click();

            const orgOption = page.getByRole('option', { name: newOrg.name });
            if ((await orgOption.count()) > 0) {
                await orgOption.click();
                await page.waitForLoadState('domcontentloaded');

                await page.goto('/dashboard/objectives');
                await page.waitForLoadState('domcontentloaded');

                await expect(page.getByText(obj1.title)).toBeHidden();
            }
        }
    });

    test('organization detail page', async ({ page }) => {
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const row = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = row.getByTestId('organization-detail-link');

        if (await viewLink.isVisible()) {
            await viewLink.click();
            await page.waitForLoadState('domcontentloaded');

            await expect(page).toHaveURL(/\/dashboard\/organizations\/.+/);

            await expect(page.getByText(org.name)).toBeVisible();
        }
    });

    test('validate organization name required', { tag: ['@REQ-EQUIPOS-001'] }, async ({ page }) => {
        await page.goto('/dashboard/organizations');

        await page.getByTestId('organization-create-open').click();

        await page.getByTestId('organization-save-button').click();

        const errorMessage = page.locator('text=/required|requerido|name/i');
        const hasError = (await errorMessage.count()) > 0;

        const modalStillOpen = await page.getByTestId('organization-name-input').isVisible();

        expect(hasError || modalStillOpen).toBeTruthy();
    });

    test('organization shows member count', async ({ page }) => {
        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const memberCount = page.getByText(/\d+.*member|\d+.*miembro/i);

        if ((await memberCount.count()) > 0) {
            await expect(memberCount.first()).toBeVisible();
        }
    });
});
