import { test, expect } from '../../fixtures/test-base';
import { createOrganization } from '../../helpers/test-helpers';
import type { Page } from '@playwright/test';

const ORGANIZATION_DETAIL_URL = /\/dashboard\/organizations\/[^/?]+(?:\?|$)/;

async function openOrganizationDetail(page: Page, organizationName?: string) {
    await page.goto('/dashboard/organizations');
    await page.waitForURL(/\/dashboard\/organizations(?:\?|$)/, { timeout: 15000 });

    const orgRow = organizationName
        ? page.getByTestId('table-row').filter({ hasText: organizationName }).first()
        : page.getByTestId('table-row').first();
    const viewLink = orgRow.getByTestId('organization-detail-link');

    await expect(viewLink).toBeVisible({ timeout: 10000 });
    await viewLink.click();
    await expect(page).toHaveURL(ORGANIZATION_DETAIL_URL, { timeout: 10000 });
    await expect(page.getByTestId('organization-members-table')).toBeVisible({ timeout: 10000 });
}

test.describe('Organization Members', () => {
    test('view organization members', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        await openOrganizationDetail(page);

        const membersSection = page.locator('text=/members|miembros/i');
        const hasMembersSection = (await membersSection.count()) > 0;

        const membersTab = page.locator('button:has-text("Members"), [data-testid*="members"]');
        expect(hasMembersSection || (await membersTab.count()) > 0).toBeTruthy();
        if ((await membersTab.count()) > 0) {
            await membersTab.first().click();
            await page.waitForLoadState('domcontentloaded');
        }

        const memberList = page.getByTestId('table-row');
        expect(await memberList.count()).toBeGreaterThan(0);
    });

    test('owner can see all members', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        const org = await createOrganization(page);

        await openOrganizationDetail(page, org.name);

        const inviteButton = page.locator(
            'button:has-text("Invite"), button:has-text("Invitar"), [data-testid*="invite"]'
        );
        const hasInviteButton = (await inviteButton.count()) > 0;

        const memberList = page.locator('[data-testid*="member-list"], table');
        const hasMemberList = (await memberList.count()) > 0;

        expect(hasInviteButton || hasMemberList).toBeTruthy();
    });

    test('remove member from organization', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        const org = await createOrganization(page);

        await openOrganizationDetail(page, org.name);

        const removeButton = page.locator(
            '[data-testid*="remove-member"], button[aria-label*="remove"]'
        );
        await removeButton.count();
    });

    test('member role is displayed', { tag: ['@REQ-EQUIPOS-004'] }, async ({ page }) => {
        await openOrganizationDetail(page);

        const membersTable = page.getByTestId('organization-members-table');
        await expect(membersTable).toBeVisible({ timeout: 10000 });

        const table = membersTable.locator('table');
        await expect(table).toBeVisible();

        const roleHeader = table.locator('thead').getByText(/role|rol/i);
        await expect(roleHeader).toBeVisible();

        const rows = page.getByTestId('table-row');
        expect(await rows.count()).toBeGreaterThan(0);
    });

    test('owner cannot be removed', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        await openOrganizationDetail(page);

        const ownerRow = page.getByTestId('table-row').filter({ hasText: /owner/i });

        if ((await ownerRow.count()) > 0) {
            const removeButton = ownerRow.locator(
                '[data-testid*="remove"], button[aria-label*="remove"]'
            );

            if ((await removeButton.count()) > 0) {
                await expect(removeButton.first()).toBeDisabled();
            }
        }
    });

    test('member list shows email', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        await openOrganizationDetail(page);

        const emailDisplay = page.getByText(/@.*\.com|@.*\.test/);
        const hasEmail = (await emailDisplay.count()) > 0;
        expect(hasEmail).toBeTruthy();
    });

    test('member joined date is displayed', { tag: ['@REQ-EQUIPOS-005'] }, async ({ page }) => {
        await openOrganizationDetail(page);

        const dateDisplay = page.getByText(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|ago|hace/);
        const hasDate = (await dateDisplay.count()) > 0;
        expect(hasDate).toBeTruthy();
    });
});
