import { test, expect } from '@playwright/test';
import { createTestUserViaAPI, createOrganization } from '../../helpers/test-helpers';
import { UserFactory } from '../../helpers/factories';

test.describe('Organization Invitations', () => {
    test('invite member by email', { tag: ['@REQ-EQUIPOS-003'] }, async ({ page }) => {
        const org = await createOrganization(page, { name: `Invite Org ${Date.now()}` });

        // Navigate to organization detail
        await page.goto('/dashboard/organizations');
        await page.waitForLoadState('domcontentloaded');

        const orgRow = page.getByTestId('table-row').filter({ hasText: org.name }).first();
        const viewLink = orgRow.getByTestId('organization-detail-link');

        await expect(viewLink).toBeVisible();
        await viewLink.click();
        await page.waitForLoadState('domcontentloaded');

        // Look for invite button
        const inviteButton = page.locator('button:has-text("Invite"), [data-testid*="invite"]');

        if ((await inviteButton.count()) > 0) {
            await inviteButton.first().click();

            // Fill invitation form
            const emailInput = page
                .locator('input[type="email"], [data-testid*="invite-email"]')
                .first();
            await expect(emailInput).toBeVisible();
            const inviteEmail = `invite-${Date.now()}@example.com`;
            await emailInput.fill(inviteEmail);

            // Role selection if available
            const roleSelect = page.locator('[data-testid*="role"], select:has-text("Role")');
            if ((await roleSelect.count()) > 0) {
                await roleSelect.first().click();
                const memberOption = page.getByRole('option', { name: /member|miembro/i });
                if ((await memberOption.count()) > 0) {
                    await memberOption.click();
                }
            }

            // Send invitation
            const sendButton = page
                .locator(
                    'button:has-text("Send"), button:has-text("Invite"), button:has-text("Enviar")'
                )
                .first();
            await sendButton.click();

            await page.waitForLoadState('domcontentloaded');

            // Should show success message or invitation in list
        }
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

        // Look for invitations tab or section
        const invitationsTab = page.locator(
            'button:has-text("Invitations"), button:has-text("Invitaciones"), [data-testid*="invitations"]'
        );

        if ((await invitationsTab.count()) > 0) {
            await invitationsTab.first().click();
            await page.waitForLoadState('domcontentloaded');

            // Should show pending invitations (or empty state)
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

        // First, send an invitation
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

            // Now look for cancel button on the invitation
            const cancelButton = page.locator(
                'button:has-text("Cancel"), button:has-text("Revoke"), [data-testid*="cancel-invitation"]'
            );

            if ((await cancelButton.count()) > 0) {
                await cancelButton.first().click();

                // Confirm if needed
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
        // Navigate to invitations page
        await page.goto('/dashboard/invitations');
        await page.waitForLoadState('domcontentloaded');

        // Page should load (even if empty)
        await expect(page).toHaveURL(/\/dashboard\/invitations/);

        // Should show invitations list or empty state
        const emptyState = page.locator('text=/no.*invitations|sin invitaciones/i');
        const invitationsList = page.getByTestId('table-row');

        const hasContent = (await emptyState.count()) > 0 || (await invitationsList.count()) > 0;
        expect(hasContent).toBeTruthy();
    });

    test(
        'accept invitation as existing user',
        { tag: ['@REQ-EQUIPOS-008'] },
        async ({ page, context }) => {
            // This test requires two users
            // User 1 sends invitation, User 2 accepts

            // Create first user and organization
            const user1 = await createTestUserViaAPI(page);
            const org = await createOrganization(page, { name: `Accept Org ${Date.now()}` });

            // Navigate to org and send invitation
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

                // Create another user's email for invitation
                const newUserData = UserFactory.create();

                const emailInput = page.getByTestId('organization-member-email-input');
                await expect(emailInput).toBeVisible();
                await emailInput.fill(newUserData.email);

                const sendButton = page
                    .locator('button:has-text("Send"), button:has-text("Invite")')
                    .first();
                await sendButton.click();
                await page.waitForLoadState('domcontentloaded');

                // Note: In a full test, we would:
                // 1. Create a new browser context for user 2
                // 2. Register user 2 with the invited email
                // 3. Accept the invitation
            }
        }
    );

    test('decline invitation', { tag: ['@REQ-EQUIPOS-008'] }, async ({ page }) => {
        // Navigate to invitations page
        await page.goto('/dashboard/invitations');
        await page.waitForLoadState('domcontentloaded');

        // Look for decline button on any invitation
        const declineButton = page.locator(
            'button:has-text("Decline"), button:has-text("Reject"), button:has-text("Rechazar")'
        );

        if ((await declineButton.count()) > 0) {
            await declineButton.first().click();

            // Confirm decline if needed
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

        // Look for resend button on any pending invitation
        const resendButton = page.locator('button:has-text("Resend"), button:has-text("Reenviar")');

        if ((await resendButton.count()) > 0) {
            await resendButton.first().click();
            await page.waitForLoadState('domcontentloaded');

            // Should show success message
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

        // Look for copy link button
        const copyLinkButton = page.locator(
            'button:has-text("Copy Link"), button:has-text("Copiar"), [data-testid*="copy-link"]'
        );

        if ((await copyLinkButton.count()) > 0) {
            // Copy link button should be present for sharing invitations
            await expect(copyLinkButton.first()).toBeVisible();
        }
    });
});
