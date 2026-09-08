import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test-base';
import { createOrganization } from '../../helpers/test-helpers';
import { setupCollaboratorInOrganization } from '../../helpers/collaboration';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
const getOrganizationInvitations = makeFunctionReference<
    'query',
    {
        organizationId: string;
    },
    ReadonlyArray<{
        email: string;
        status: string;
    }>
>('organizations:getOrganizationInvitations');
async function openOrganizationDetail(page: Page, name: string): Promise<string> {
    await page.goto('/dashboard/organizations', { waitUntil: 'domcontentloaded' });
    const orgRow = page.getByTestId('table-row').filter({ hasText: name }).first();
    await expect(orgRow).toBeVisible({ timeout: 15000 });
    const detailLink = orgRow.getByTestId('organization-detail-link');
    const href = await detailLink.getAttribute('href');
    const organizationId = href?.split('/').pop();
    if (!(typeof organizationId === 'string') || organizationId.length === 0) {
        throw new Error('Missing organization id from detail link');
    }
    await detailLink.click();
    await page.waitForLoadState('domcontentloaded');
    return organizationId;
}
test.describe('Organization Invitations', () => {
    test('invite member by email', { tag: ['@REQ-EQUIPOS-002'] }, async ({ page }) => {
        const organization = await createOrganization(page, { name: `Invite Org ${Date.now()}` });
        const organizationId = await openOrganizationDetail(page, organization.name);
        await page.getByTestId('organization-member-create-open').click();
        const inviteEmail = `invite-${Date.now()}@example.com`;
        await page.getByTestId('organization-member-email-input').fill(inviteEmail);
        await page.getByTestId('organization-member-save-button').click();
        await expect(page.getByTestId('organization-member-email-input')).toBeHidden({
            timeout: 15000,
        });
        const cookies = await page.context().cookies();
        const convexToken = cookies.find(c => c.name === 'better-auth.convex_jwt')?.value;
        if (!convexToken) {
            throw new Error('Missing Convex auth token after creating invitation');
        }
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? 'http://127.0.0.1:3210';
        const client = new ConvexHttpClient(convexUrl);
        client.setAuth(convexToken);
        const invitations = await client.query(getOrganizationInvitations, {
            organizationId,
        });
        expect(invitations).toContainEqual(
            expect.objectContaining({
                email: inviteEmail,
                status: 'pending',
            })
        );
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
