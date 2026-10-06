import { test, expect } from '../../fixtures/test-base';
import { setupCollaboratorInOrganization } from '../../helpers/collaboration';
import type { Page } from '@playwright/test';

const ORGANIZATION_DETAIL_URL = /\/dashboard\/organizations\/[^/?]+(?:\?|$)/;

async function openOrganizationDetail(page: Page, organizationName?: string): Promise<void> {
    await page.goto('/dashboard/organizations');
    await page.waitForURL(/\/dashboard\/organizations(?:\?|$)/, { timeout: 15000 });

    let orgRow;
    if (organizationName) {
        orgRow = page.getByTestId('table-row').filter({ hasText: organizationName }).first();
    } else {
        orgRow = page.getByTestId('table-row').first();
    }

    await orgRow.getByTestId('organization-detail-link').click();
    await expect(page).toHaveURL(ORGANIZATION_DETAIL_URL, { timeout: 10000 });
    await expect(page.getByTestId('organization-members-table')).toBeVisible({ timeout: 10000 });
}

test.describe('Organization Members', () => {
    test(
        'members table shows the owner with role and email',
        { tag: ['@REQ-EQUIPOS-003'] },
        async ({ page }) => {
            await openOrganizationDetail(page);

            const membersTable = page.getByTestId('organization-members-table');
            await expect(membersTable.locator('table')).toBeVisible();
            await expect(membersTable.locator('thead')).toContainText(/role|rol/i);
            await expect(page.getByTestId('table-row').first()).toContainText(/@/);
        }
    );

    test(
        'owner removes a member from the organization',
        { tag: ['@REQ-EQUIPOS-004'] },
        async ({ page, browser }) => {
            const collaborator = await setupCollaboratorInOrganization(browser, page);
            await collaborator.context.close();

            await openOrganizationDetail(page, collaborator.organizationName);

            const memberRow = page
                .getByTestId('table-row')
                .filter({ hasText: collaborator.user.email })
                .first();
            await expect(memberRow).toBeVisible({ timeout: 15000 });

            await memberRow.getByRole('button', { name: /^(delete|eliminar)$/i }).click();
            await page.getByTestId('delete-confirm-button').click();

            await expect(
                page.getByTestId('table-row').filter({ hasText: collaborator.user.email })
            ).toHaveCount(0, { timeout: 15000 });
        }
    );

    test(
        'owner row cannot be removed from the organization',
        { tag: ['@REQ-EQUIPOS-004'] },
        async ({ page }) => {
            await openOrganizationDetail(page);

            const ownerRow = page
                .getByTestId('table-row')
                .filter({ hasText: /owner|propietario/i })
                .first();
            await expect(ownerRow).toBeVisible({ timeout: 10000 });
            await expect(
                ownerRow.getByRole('button', { name: /^(delete|eliminar)$/i })
            ).toHaveCount(0);
        }
    );

    test(
        'regular members cannot see organization management actions',
        { tag: ['@REQ-EQUIPOS-003', '@REQ-EQUIPOS-004'] },
        async ({ page, browser }) => {
            const collaborator = await setupCollaboratorInOrganization(browser, page);

            try {
                await openOrganizationDetail(collaborator.page, collaborator.organizationName);

                await expect(
                    collaborator.page.getByTestId('organization-member-create-open')
                ).toHaveCount(0);
                await expect(
                    collaborator.page.getByTestId('organization-member-edit-open')
                ).toHaveCount(0);
                await expect(
                    collaborator.page.getByRole('button', { name: /^(delete|eliminar)$/i })
                ).toHaveCount(0);
            } finally {
                await collaborator.context.close();
            }
        }
    );

    test(
        'admins can manage invitations without receiving owner-only actions',
        { tag: ['@REQ-EQUIPOS-002', '@REQ-EQUIPOS-003', '@REQ-EQUIPOS-004'] },
        async ({ page, browser }) => {
            const collaborator = await setupCollaboratorInOrganization(browser, page);

            try {
                await openOrganizationDetail(page, collaborator.organizationName);
                const memberRow = page
                    .getByTestId('table-row')
                    .filter({ hasText: collaborator.user.email })
                    .first();
                await memberRow.getByTestId('organization-member-edit-open').click();
                await page.getByTestId('organization-member-edit-role-select').click();
                await page.getByRole('option', { name: /^(admin|administrador)$/i }).click();
                await page.getByTestId('organization-member-edit-save-button').click();
                await expect(page.getByTestId('organization-member-edit-role-select')).toBeHidden({
                    timeout: 10000,
                });

                await openOrganizationDetail(collaborator.page, collaborator.organizationName);
                await expect(
                    collaborator.page.getByTestId('organization-member-create-open')
                ).toBeVisible();

                await collaborator.page.getByTestId('organization-member-create-open').click();
                await collaborator.page.getByTestId('organization-member-role-select').click();
                await expect(
                    collaborator.page.getByRole('option', {
                        name: /^(owner|propietario)$/i,
                    })
                ).toHaveCount(0);
                await expect(
                    collaborator.page.getByRole('option', {
                        name: /^(member|miembro)$/i,
                    })
                ).toBeVisible();
                await collaborator.page.keyboard.press('Escape');
                await collaborator.page.keyboard.press('Escape');

                await collaborator.page.goto('/dashboard/organizations');
                const organizationRow = collaborator.page
                    .getByTestId('table-row')
                    .filter({ hasText: collaborator.organizationName })
                    .first();
                await expect(organizationRow).toBeVisible({ timeout: 10000 });
                await expect(organizationRow.getByTestId('organization-edit-open')).toBeVisible();
                await expect(organizationRow.getByTestId('organization-delete-button')).toHaveCount(
                    0
                );
            } finally {
                await collaborator.context.close();
            }
        }
    );
});
