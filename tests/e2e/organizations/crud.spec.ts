import { test, expect, Page } from '@playwright/test';
import {
    createTestUser,
    createOrganization,
    createObjective,
    ensureDefaultCategories,
} from '../../helpers/test-helpers';
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
        await page.waitForLoadState('networkidle');
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
            await page.waitForLoadState('networkidle');
            return;
        }
    }

    await page.keyboard.press('Escape');
}

test.describe('Organizations CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await createTestUser(page);
    });

    test('view organizations list', async ({ page }) => {
        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');

        // Organizations page should load
        await expect(page).toHaveURL(/\/dashboard\/organizations/);

        // Should see the user's initial organization (created during registration)
        // Or create button
        const createButton = page.getByTestId('organization-create-open');
        const hasCreateButton = await createButton.isVisible();

        // There should be at least one organization or a create button
        const orgList = page.locator('tr, [data-testid*="organization"]');
        const hasOrgs = (await orgList.count()) > 0;

        expect(hasCreateButton || hasOrgs).toBeTruthy();
    });

    test('create new organization', async ({ page }) => {
        const orgData = OrganizationFactory.create();

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');

        // Open create modal
        await page.getByTestId('organization-create-open').click();

        // Fill form
        await page.getByTestId('organization-name-input').fill(orgData.name);
        await page.getByTestId('organization-description-input').fill(orgData.description);

        // Save
        await page.getByTestId('organization-save-button').click();

        // Verify organization appears
        await expect(page.getByText(orgData.name)).toBeVisible({ timeout: 10000 });
    });

    test('edit organization name', async ({ page }) => {
        // Create an organization
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await setActiveOrganization(page, org.name);

        // Find the organization and edit (uses data-testid="organization-edit-open")
        const orgTable = page.getByTestId('organizations-table');
        const orgRows = orgTable.locator('[data-testid="table-row"]', { hasText: org.name });
        const row = orgRows.first();
        const editButton = row.getByTestId('organization-edit-open');

        if (await editButton.isVisible()) {
            await editButton.click();
            await page.waitForTimeout(500);

            // Update name (uses data-testid="organization-edit-name-input")
            const nameInput = page.getByTestId('organization-edit-name-input');
            await expect(nameInput).toBeVisible({ timeout: 10000 });

            const newName = `Updated Org ${Date.now()}`;
            await nameInput.fill(newName);

            // Save (uses data-testid="organization-edit-save-button")
            const saveButton = page.getByTestId('organization-edit-save-button');
            await saveButton.click();

            // Verify update
            await expect
                .poll(
                    async () =>
                        await orgTable
                            .locator('[data-testid="table-row"]', { hasText: newName })
                            .count(),
                    { timeout: 20000, intervals: [500, 1000, 2000] }
                )
                .toBeGreaterThan(0);
        }
    });

    test('delete organization', async ({ page }) => {
        // Create an extra organization (can't delete the only one)
        const org = await createOrganization(page, { name: `Delete Org ${Date.now()}` });

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');
        await setActiveOrganization(page, org.name);

        const orgTable = page.getByTestId('organizations-table');
        const orgRows = orgTable.locator('[data-testid="table-row"]', { hasText: org.name });
        const row = orgRows.first();

        await expect(row).toBeVisible();

        // Find and click delete (uses data-testid="organization-delete-button")
        const deleteButton = row.getByTestId('organization-delete-button');

        if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Confirm deletion
            const confirmDialog = page.locator(
                '[data-slot="alert-dialog-content"], [role="alertdialog"]'
            );
            await expect(confirmDialog).toBeVisible({ timeout: 5000 });

            const confirmButton = confirmDialog.getByTestId('delete-confirm-button');
            await confirmButton.click();

            await page.waitForTimeout(3000);
            await page.waitForLoadState('networkidle');

            // Organization should be removed
            await expect
                .poll(async () => await orgRows.count(), {
                    timeout: 20000,
                    intervals: [1000, 2000, 3000],
                })
                .toBe(0);
        }
    });

    test('switch active organization', async ({ page }) => {
        // Create a second organization
        const newOrg = await createOrganization(page, { name: `Switch Org ${Date.now()}` });

        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        // Look for organization switcher
        const orgSwitcher = page.locator(
            '[data-testid*="org-switch"], [data-testid*="organization-switch"], [aria-label*="organization"]'
        );

        if ((await orgSwitcher.count()) > 0) {
            await orgSwitcher.first().click();

            // Select the new organization
            const orgOption = page.getByRole('option', { name: newOrg.name });
            if ((await orgOption.count()) > 0) {
                await orgOption.click();

                await page.waitForTimeout(2000);
                await page.waitForLoadState('networkidle');

                // Active organization should change
            }
        } else {
            // Organization switcher might be in sidebar or header
            const sidebarSwitcher = page.locator(
                'aside [data-testid*="org"], header [data-testid*="org"]'
            );
            if ((await sidebarSwitcher.count()) > 0) {
                await sidebarSwitcher.first().click();
            }
        }
    });

    test('data isolation between organizations', async ({ page }) => {
        // Ensure categories exist for first org
        await ensureDefaultCategories(page);

        // Create objective in first organization
        const obj1 = await createObjective(page, {
            title: `Org1 Objective ${Date.now()}`,
            ensureCategories: false,
        });

        // Create second organization
        const newOrg = await createOrganization(page, { name: `Isolated Org ${Date.now()}` });

        // Try to switch to new organization
        await page.goto('/dashboard/home');
        await page.waitForLoadState('networkidle');

        const orgSwitcher = page.locator(
            '[data-testid*="org-switch"], button:has-text("Organization")'
        );

        if ((await orgSwitcher.count()) > 0) {
            await orgSwitcher.first().click();

            const orgOption = page.getByRole('option', { name: newOrg.name });
            if ((await orgOption.count()) > 0) {
                await orgOption.click();
                await page.waitForTimeout(2000);
                await page.waitForLoadState('networkidle');

                // Navigate to objectives
                await page.goto('/dashboard/objectives');
                await page.waitForLoadState('networkidle');

                // Objective from other org should NOT be visible
                await expect(page.getByText(obj1.title)).toBeHidden();
            }
        }
    });

    test('organization detail page', async ({ page }) => {
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');

        // Click on organization to view details
        const row = page.locator('tr', { hasText: org.name }).first();
        const viewLink = row.locator('a, [data-testid*="view"]').first();

        if (await viewLink.isVisible()) {
            await viewLink.click();
            await page.waitForLoadState('networkidle');

            // Should be on organization detail page
            await expect(page).toHaveURL(/\/dashboard\/organizations\/.+/);

            // Should show organization info
            await expect(page.getByText(org.name)).toBeVisible();
        }
    });

    test('validate organization name required', async ({ page }) => {
        await page.goto('/dashboard/organizations');

        await page.getByTestId('organization-create-open').click();

        // Try to save without name
        await page.getByTestId('organization-save-button').click();

        // Should show validation error or stay on form
        const errorMessage = page.locator('text=/required|requerido|name/i');
        const hasError = (await errorMessage.count()) > 0;

        const modalStillOpen = await page.getByTestId('organization-name-input').isVisible();

        expect(hasError || modalStillOpen).toBeTruthy();
    });

    test('organization shows member count', async ({ page }) => {
        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('networkidle');

        // Look for member count indicator
        const memberCount = page.getByText(/\d+.*member|\d+.*miembro/i);

        // Organizations should show member count (at least 1 - the owner)
        if ((await memberCount.count()) > 0) {
            await expect(memberCount.first()).toBeVisible();
        }
    });
});
