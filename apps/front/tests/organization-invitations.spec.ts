import { test, expect } from '@playwright/test';
import { createTestUser, createOrganization } from './test-helpers';
import { randomUUID } from 'crypto';

async function openOrganizationDetail(
    page: import('@playwright/test').Page,
    organizationName: string
) {
    await page.goto('/dashboard/organizations');
    await page.waitForLoadState('networkidle');

    const organizationRow = page.locator('tr', { hasText: organizationName }).first();
    await organizationRow.getByTestId('organization-detail-link').click();
    await expect(page).toHaveURL(/\/dashboard\/organizations\//);
}

test('organization invitations: invite member and see pending invitation', async ({ page }) => {
    const uuid = randomUUID();
    const inviteEmail = `invitee-${uuid}@example.com`;

    await createTestUser(page);
    const organization = await createOrganization(page, {
        name: `invite-org-${uuid}`,
        description: 'Organization for invitation tests',
    });

    await openOrganizationDetail(page, organization.name);

    await page.getByTestId('organization-member-create-open').click();
    await expect(page.getByTestId('organization-member-email-input')).toBeVisible();
    await page.getByTestId('organization-member-email-input').fill(inviteEmail);
    await page.getByTestId('organization-member-role-select').click();
    await page.getByRole('option', { name: /member/i }).click();
    await page.getByTestId('organization-member-save-button').click();

    await expect(page.getByTestId('organization-members-table')).toBeVisible();
});

test('organization invitations: pending invitation appears in invitations page', async ({
    page,
}) => {
    const uuid = randomUUID();
    const inviteEmail = `pending-${uuid}@example.com`;

    const { email } = await createTestUser(page);
    const organization = await createOrganization(page, {
        name: `pending-org-${uuid}`,
        description: 'Pending invitations org',
    });

    await openOrganizationDetail(page, organization.name);
    await page.getByTestId('organization-member-create-open').click();
    await page.getByTestId('organization-member-email-input').fill(inviteEmail);
    await page.getByTestId('organization-member-save-button').click();

    await page.goto('/dashboard/invitations');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('invitations-list')).toBeVisible();
});

test('organization invitations: accept invitation from invitations page', async ({ browser }) => {
    const uuid = randomUUID();
    const inviteEmail = `accept-${uuid}@example.com`;

    // Owner creates org and invitation
    const contextOwner = await browser.newContext();
    const pageOwner = await contextOwner.newPage();
    await createTestUser(pageOwner, { customEmail: inviteEmail });
    const organization = await createOrganization(pageOwner, {
        name: `accept-org-${uuid}`,
        description: 'Accept invitation org',
    });
    await openOrganizationDetail(pageOwner, organization.name);
    await pageOwner.getByTestId('organization-member-create-open').click();
    await pageOwner.getByTestId('organization-member-email-input').fill(inviteEmail);
    await pageOwner.getByTestId('organization-member-save-button').click();

    await contextOwner.close();

    // Invitee logs in and accepts invitation
    const contextInvitee = await browser.newContext();
    const pageInvitee = await contextInvitee.newPage();
    await createTestUser(pageInvitee, {
        customEmail: inviteEmail,
        customUsername: `invitee-${uuid}`,
    });
    await pageInvitee.goto('/dashboard/invitations');
    await pageInvitee.waitForLoadState('networkidle');

    const acceptButton = pageInvitee.getByTestId('invitation-accept-button').first();
    await expect(acceptButton).toBeVisible({ timeout: 10000 });
    await acceptButton.click();

    await contextInvitee.close();
});

test('organization invitations: reject invitation from invitations page', async ({ browser }) => {
    const uuid = randomUUID();
    const inviteEmail = `reject-${uuid}@example.com`;

    // Owner creates org and invitation
    const contextOwner = await browser.newContext();
    const pageOwner = await contextOwner.newPage();
    await createTestUser(pageOwner, { customEmail: inviteEmail });
    const organization = await createOrganization(pageOwner, {
        name: `reject-org-${uuid}`,
        description: 'Reject invitation org',
    });
    await openOrganizationDetail(pageOwner, organization.name);
    await pageOwner.getByTestId('organization-member-create-open').click();
    await pageOwner.getByTestId('organization-member-email-input').fill(inviteEmail);
    await pageOwner.getByTestId('organization-member-save-button').click();
    await contextOwner.close();

    const contextInvitee = await browser.newContext();
    const pageInvitee = await contextInvitee.newPage();
    await createTestUser(pageInvitee, {
        customEmail: inviteEmail,
        customUsername: `invitee-${uuid}`,
    });
    await pageInvitee.goto('/dashboard/invitations');
    await pageInvitee.waitForLoadState('networkidle');

    const rejectButton = pageInvitee.getByTestId('invitation-reject-button').first();
    await expect(rejectButton).toBeVisible({ timeout: 10000 });
    await rejectButton.click();

    await contextInvitee.close();
});
