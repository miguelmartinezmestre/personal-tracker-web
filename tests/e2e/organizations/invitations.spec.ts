import type { Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization, createTestUser } from '../../helpers/test-helpers';
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

async function inviteByEmail(
    page: Page,
    email: string,
    { requireEmailVerification = false } = {}
): Promise<void> {
    await page.getByTestId('organization-member-create-open').click();
    await page.getByTestId('organization-member-email-input').fill(email);

    if (requireEmailVerification) {
        await page.getByTestId('organization-member-require-verification').check();
    }

    await page.getByTestId('organization-member-save-button').click();
    await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
        timeout: 15000,
    });
}

test.describe('Organization Invitations', () => {
    test(
        'invitee rejects an invitation and it leaves the list',
        { tag: ['@REQ-EQUIPOS-005', '@REQ-EQUIPOS-006'] },
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
        'an invitation that asks for a verified email waits until the invitee verifies it',
        { tag: ['@REQ-EQUIPOS-002', '@REQ-EQUIPOS-006', '@INH-ORG-08', '@INH-AUT-05'] },
        async ({ page, browser }) => {
            const inviteeContext = await browser.newContext();

            try {
                const inviteePage = await inviteeContext.newPage();
                const invitee = await createTestUser(inviteePage);

                const organization = await createOrganization(page, {
                    name: `Verified Invite Org ${randomUUID().substring(0, 8)}`,
                });

                await openOrganizationDetail(page, organization.name);
                await inviteByEmail(page, invitee.email, { requireEmailVerification: true });

                await inviteePage.goto('/dashboard/invitations', { waitUntil: 'domcontentloaded' });
                await expect(
                    inviteePage.getByTestId('invitation-verification-required')
                ).toBeVisible({
                    timeout: 15000,
                });
                await expect(inviteePage.getByTestId('invitations-list')).toHaveCount(0);

                await verifyEmailFromInvitationPage(inviteePage, invitee.email);

                const invitationRow = inviteePage
                    .getByTestId('table-row')
                    .filter({ hasText: organization.name });

                await invitationRow.getByTestId('invitation-accept-button').click();
                await inviteePage.getByTestId('invitation-accept-confirm-button').click();
                await expect(inviteePage.getByTestId('organization-switcher')).toContainText(
                    organization.name,
                    { timeout: 20000 }
                );
            } finally {
                await inviteeContext.close();
            }
        }
    );

    test(
        'signing up from an invitation link joins the organization straight away',
        { tag: ['@REQ-EQUIPOS-006', '@INH-AUT-04', '@INH-ORG-01'] },
        async ({ page, browser }) => {
            const organization = await createOrganization(page, {
                name: `Sign Up Invite Org ${randomUUID().substring(0, 8)}`,
            });

            await openOrganizationDetail(page, organization.name);
            const inviteEmail = `signup-${randomUUID().substring(0, 8)}@example.com`;
            const invitedAt = Date.now();
            await inviteByEmail(page, inviteEmail);
            const invitationUrl = await waitForInvitationUrl(page, inviteEmail, invitedAt);

            const inviteeContext = await browser.newContext();

            try {
                const inviteePage = await inviteeContext.newPage();
                const invitationPath = new URL(invitationUrl).pathname;
                const token = invitationPath.split('/').at(-1) ?? '';
                await inviteePage.goto(`/register?invitation=${token}`, {
                    waitUntil: 'domcontentloaded',
                });
                await inviteePage.getByTestId('register-username-input').fill('Invited newcomer');
                await inviteePage.getByTestId('register-email-input').fill(inviteEmail);
                await inviteePage.getByTestId('register-password-input').fill('Password123');
                await inviteePage
                    .getByTestId('register-confirm-password-input')
                    .fill('Password123');
                await inviteePage.getByTestId('register-button').click();
                await inviteePage.getByTestId('register-categories-skip').click({ timeout: 20000 });

                await expect(inviteePage).toHaveURL(/\/dashboard\/home(\?|$)/, { timeout: 20000 });
                await expect(inviteePage.getByTestId('organization-switcher')).toContainText(
                    organization.name,
                    { timeout: 20000 }
                );
            } finally {
                await inviteeContext.close();
            }
        }
    );
});
