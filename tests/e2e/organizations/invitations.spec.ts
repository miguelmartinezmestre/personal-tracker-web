import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization } from '../../helpers/test-helpers';
import { setupCollaboratorInOrganization } from '../../helpers/collaboration';
import { waitForInvitationUrl } from '../../helpers/email-verification';

async function openOrganizationDetail(page: Page, name: string): Promise<void> {
    await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
    const orgRow = page.getByTestId('table-row').filter({ hasText: name }).first();
    await expect(orgRow).toBeVisible({ timeout: 15000 });
    const detailLink = orgRow.getByTestId('organization-detail-link');
    await detailLink.click();
    await page.waitForLoadState('domcontentloaded');
}
test.describe('Organization Invitations', () => {
    test('invite member by email', { tag: ['@REQ-EQUIPOS-002'] }, async ({ page }) => {
        const organization = await createOrganization(page, { name: `Invite Org ${Date.now()}` });
        await openOrganizationDetail(page, organization.name);
        await page.getByTestId('organization-member-create-open').click();
        const inviteEmail = `invite-${Date.now()}@example.com`;
        await page.getByTestId('organization-member-email-input').fill(inviteEmail);
        const invitedAt = Date.now();
        await page.getByTestId('organization-member-save-button').click();
        await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
            timeout: 15000,
        });
        const invitationUrl = await waitForInvitationUrl(page, inviteEmail, invitedAt);
        expect(new URL(invitationUrl).pathname).toMatch(/^\/invitations\/[^/]+$/);
    });
    test('view pending invitations received', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        await page.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/dashboard\/invitations/);
        await expect(
            page.getByTestId('invitations-empty').or(page.getByTestId('invitations-list'))
        ).toBeVisible({ timeout: 15000 });
    });
    test(
        'accepting an invitation adds the user as an organization member',
        { tag: ['@REQ-EQUIPOS-006'] },
        async ({ page, browser }) => {
            const collaborator = await setupCollaboratorInOrganization(browser, page);
            try {
                await openOrganizationDetail(page, collaborator.organizationName);
                const memberRow = page
                    .getByTestId('table-row')
                    .filter({ hasText: collaborator.user.email })
                    .first();
                await expect(memberRow).toBeVisible({ timeout: 15000 });
            } finally {
                await collaborator.context.close();
            }
        }
    );
});
