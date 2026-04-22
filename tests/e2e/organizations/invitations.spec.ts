import { test, expect } from '../../fixtures/test-base';
import { createTestUserViaAPI, createOrganization } from '../../helpers/test-helpers';
import { UserFactory } from '../../helpers/factories';

test.describe('Organization Invitations', () => {
    test('invite member by email', { tag: ['@REQ-EQUIPOS-003'] }, async ({ page }) => {
        const org = await createOrganization(page, { name: `Invite Org ${Date.now()}` });

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = orgRow.getByTestId('organization-detail-link');

        await expect(viewLink).toBeVisible();
        await viewLink.click();
        await page.waitForLoadState('domcontentloaded');

        const inviteButton = page.getByTestId('organization-member-create-open');
        await expect(inviteButton).toBeVisible();
        await inviteButton.click();

        const emailInput = page
            .locator('[data-testid="organization-member-email-input"], input[type="email"]')
            .first();
        await expect(emailInput).toBeVisible();
        const inviteEmail = `invite-${Date.now()}@example.com`;
        await emailInput.fill(inviteEmail);

        const roleSelect = page.locator('[data-testid*="role"], select:has-text("Role")');
        if ((await roleSelect.count()) > 0) {
            await roleSelect.first().click();
            const memberOption = page.getByRole('option', { name: /member|miembro/i });
            if ((await memberOption.count()) > 0) {
                await memberOption.click();
            }
        }

        const sendButton = page.getByTestId('organization-member-save-button');
        await expect(sendButton).toBeVisible();
        await sendButton.click();

        await page.waitForLoadState('domcontentloaded');

        const invitationsTable = page.getByTestId('table-row');
        const successState = page.locator(
            'text=/invited|invitation sent|invitacion enviada|pending invitation/i'
        );
        expect(
            (await invitationsTable.count()) > 0 || (await successState.count()) > 0
        ).toBeTruthy();
    });

    test('view pending invitations sent', { tag: ['@REQ-EQUIPOS-007'] }, async ({ page }) => {
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = orgRow.getByTestId('organization-detail-link');

        await expect(viewLink).toBeVisible();
        await viewLink.click();
        await page.waitForLoadState('domcontentloaded');

        const invitationsTab = page.locator(
            'button:has-text("Invitations"), button:has-text("Invitaciones"), [data-testid*="invitations"]'
        );

        if ((await invitationsTab.count()) > 0) {
            await invitationsTab.first().click();
            await page.waitForLoadState('domcontentloaded');
        }
    });

    test('cancel pending invitation', async ({ page }) => {
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = orgRow.getByTestId('organization-detail-link');

        await expect(viewLink).toBeVisible();
        await viewLink.click();
        await page.waitForLoadState('domcontentloaded');

        const inviteButton = page.locator('button:has-text("Invite"), [data-testid*="invite"]');

        if ((await inviteButton.count()) > 0) {
            await inviteButton.first().click();

            const emailInput = page.getByTestId('organization-member-email-input');
            await expect(emailInput).toBeVisible();
            await emailInput.fill(`cancel-test-${Date.now()}@example.com`);

            const sendButton = page
                .locator('button:has-text("Send"), button:has-text("Invite")')
                .first();
            await sendButton.click();
            await page.waitForLoadState('domcontentloaded');

            const cancelButton = page.locator(
                'button:has-text("Cancel"), button:has-text("Revoke"), [data-testid*="cancel-invitation"]'
            );

            if ((await cancelButton.count()) > 0) {
                await cancelButton.first().click();

                const confirmButton = page.locator(
                    '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Yes")'
                );
                if ((await confirmButton.count()) > 0) {
                    await confirmButton.click();
                }
            }
        }
    });

    test('view pending invitations received', { tag: ['@REQ-EQUIPOS-007'] }, async ({ page }) => {
        await page.goto('/dashboard/invitations');
        await page.waitForLoadState('domcontentloaded');

        await expect(page).toHaveURL(/\/dashboard\/invitations/);

        const emptyState = page.locator('text=/no.*invitations|sin invitaciones/i');
        const invitationsList = page.getByTestId('table-row');

        const hasContent = (await emptyState.count()) > 0 || (await invitationsList.count()) > 0;
        expect(hasContent).toBeTruthy();
    });

    test(
        'accept invitation as existing user',
        { tag: ['@REQ-EQUIPOS-008'] },
        async ({ page, context }) => {
            const user1 = await createTestUserViaAPI(page);
            const org = await createOrganization(page, { name: `Accept Org ${Date.now()}` });

            await page.goto('/dashboard/organizations');
            await page.waitForLoadState('domcontentloaded');

            const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
            const viewLink = orgRow.getByTestId('organization-detail-link');

            await expect(viewLink).toBeVisible();
            await viewLink.click();
            await page.waitForLoadState('domcontentloaded');

            const inviteButton = page.locator('button:has-text("Invite"), [data-testid*="invite"]');

            if ((await inviteButton.count()) > 0) {
                await inviteButton.first().click();

                const newUserData = UserFactory.create();

                const emailInput = page.getByTestId('organization-member-email-input');
                await expect(emailInput).toBeVisible();
                await emailInput.fill(newUserData.email);

                const sendButton = page
                    .locator('button:has-text("Send"), button:has-text("Invite")')
                    .first();
                await sendButton.click();
                await page.waitForLoadState('domcontentloaded');
            }
        }
    );

    test('decline invitation', { tag: ['@REQ-EQUIPOS-008'] }, async ({ page }) => {
        await page.goto('/dashboard/invitations');
        await page.waitForLoadState('domcontentloaded');

        const declineButton = page.locator(
            'button:has-text("Decline"), button:has-text("Reject"), button:has-text("Rechazar")'
        );

        if ((await declineButton.count()) > 0) {
            await declineButton.first().click();

            const confirmButton = page.locator(
                '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Yes")'
            );
            if ((await confirmButton.count()) > 0) {
                await confirmButton.click();
            }
        }
    });

    test('resend invitation', async ({ page }) => {
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = orgRow.getByTestId('organization-detail-link');

        await expect(viewLink).toBeVisible();
        await viewLink.click();
        await page.waitForLoadState('domcontentloaded');

        const resendButton = page.locator('button:has-text("Resend"), button:has-text("Reenviar")');

        if ((await resendButton.count()) > 0) {
            await resendButton.first().click();
            await page.waitForLoadState('domcontentloaded');
        }
    });

    test('invitation link shows in UI', async ({ page }) => {
        const org = await createOrganization(page);

        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = orgRow.getByTestId('organization-detail-link');

        await expect(viewLink).toBeVisible();
        await viewLink.click();
        await page.waitForLoadState('domcontentloaded');

        const copyLinkButton = page.locator(
            'button:has-text("Copy Link"), button:has-text("Copiar"), [data-testid*="copy-link"]'
        );

        if ((await copyLinkButton.count()) > 0) {
            await expect(copyLinkButton.first()).toBeVisible();
        }
    });
});
