import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization, createTestUser } from '../../helpers/test-helpers';
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

async function inviteByEmail(page: Page, email: string): Promise<void> {
    await page.getByTestId('organization-member-create-open').click();
    await page.getByTestId('organization-member-email-input').fill(email);
    await page.getByTestId('organization-member-save-button').click();
    await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
        timeout: 15000,
    });
}

test.describe('Organization Invitations', () => {
    test('invite member by email', { tag: ['@REQ-EQUIPOS-002'] }, async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Invite Org ${randomUUID().substring(0, 8)}`,
        });
        await openOrganizationDetail(page, organization.name);
        const inviteEmail = `invite-${randomUUID().substring(0, 8)}@example.com`;
        const invitedAt = Date.now();
        await inviteByEmail(page, inviteEmail);
        const invitationUrl = await waitForInvitationUrl(page, inviteEmail, invitedAt);
        expect(new URL(invitationUrl).pathname).toMatch(/^\/invitations\/[^/]+$/);
    });
    test(
        'invitee sees the pending invitation from the inviting organization',
        { tag: ['@REQ-EQUIPOS-005'] },
        async ({ page, browser }) => {
            const inviteeContext = await browser.newContext();
            try {
                const inviteePage = await inviteeContext.newPage();
                const invitee = await createTestUser(inviteePage);
                const organization = await createOrganization(page, {
                    name: `Pending Invite Org ${randomUUID().substring(0, 8)}`,
                });
                await openOrganizationDetail(page, organization.name);
                await inviteByEmail(page, invitee.email);

                await inviteePage.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
                const invitationsList = inviteePage.getByTestId('invitations-list');
                await expect(invitationsList).toContainText(organization.name, {
                    timeout: 15000,
                });
                await expect(invitationsList.getByTestId('invitation-accept-button')).toHaveCount(
                    1
                );
            } finally {
                await inviteeContext.close();
            }
        }
    );
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
