import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization, createTestUser } from '../../helpers/test-helpers';
import { setupCollaboratorInOrganization } from '../../helpers/collaboration';
import {
    verifyEmailFromInvitationPage,
    waitForInvitationUrl,
} from '../../helpers/email-verification';

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
                // Invitations stay hidden until the invitee proves they own the address.
                await expect(
                    inviteePage.getByTestId('invitation-verification-required')
                ).toBeVisible({ timeout: 15000 });
                await expect(inviteePage.getByTestId('invitations-list')).toHaveCount(0);
                await verifyEmailFromInvitationPage(inviteePage, invitee.email);
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
        'invitee rejects an invitation and it leaves the list',
        { tag: ['@REQ-EQUIPOS-006'] },
        async ({ page, browser }) => {
            const inviteeContext = await browser.newContext();

            try {
                const inviteePage = await inviteeContext.newPage();
                const invitee = await createTestUser(inviteePage);

                const organization = await createOrganization(page, {
                    name: `Reject Invite Org ${randomUUID().substring(0, 8)}`,
                });

                await openOrganizationDetail(page, organization.name);
                await inviteByEmail(page, invitee.email);

                await inviteePage.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
                await verifyEmailFromInvitationPage(inviteePage, invitee.email);

                const invitationRow = inviteePage
                    .getByTestId('table-row')
                    .filter({ hasText: organization.name });

                await expect(invitationRow).toBeVisible({ timeout: 15000 });
                await invitationRow.getByTestId('invitation-reject-button').click();
                await expect(invitationRow).toHaveCount(0, { timeout: 15000 });
            } finally {
                await inviteeContext.close();
            }
        }
    );
    test('admin cancels a pending invitation', { tag: ['@REQ-EQUIPOS-002'] }, async ({ page }) => {
        const organization = await createOrganization(page, {
            name: `Cancel Invite Org ${randomUUID().substring(0, 8)}`,
        });

        await openOrganizationDetail(page, organization.name);
        const inviteEmail = `cancel-${randomUUID().substring(0, 8)}@example.com`;
        await inviteByEmail(page, inviteEmail);

        const pendingRow = page
            .getByTestId('organization-pending-invitations')
            .getByTestId('table-row')
            .filter({ hasText: inviteEmail });

        await expect(pendingRow).toBeVisible({ timeout: 15000 });
        await pendingRow.getByTestId('organization-invitation-cancel').click();
        await page.getByTestId('delete-confirm-button').click();
        await expect(pendingRow).toHaveCount(0, { timeout: 15000 });
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
