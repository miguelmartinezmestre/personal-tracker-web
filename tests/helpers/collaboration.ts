import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createOrganization, createTestUser, type TestUserData } from './test-helpers';
import { verifyEmailFromInvitationPage } from './email-verification';

export type CollaboratorSession = {
    context: BrowserContext;
    page: Page;
    user: TestUserData;
    organizationName: string;
};

export async function setupCollaboratorInOrganization(
    browser: Browser,
    ownerPage: Page,
    options?: { organizationName?: string }
): Promise<CollaboratorSession> {
    const suffix = randomUUID().substring(0, 8);
    const organizationName = options?.organizationName ?? `Collab Org ${suffix}`;

    const context = await browser.newContext();
    const page = await context.newPage();

    const collaboratorUser = await createTestUser(page, {
        usePresentableName: true,
    });

    await page.goto('about:blank');

    await createOrganization(ownerPage, { name: organizationName });

    await ownerPage.goto('/dashboard/organizations');
    await ownerPage.waitForURL(/\/dashboard\/organizations(?:\?|$)/, { timeout: 15000 });

    const orgRow = ownerPage.getByTestId('table-row').filter({ hasText: organizationName }).first();
    await expect(orgRow).toBeVisible({ timeout: 10000 });
    await orgRow.getByTestId('organization-detail-link').click();
    await ownerPage.waitForURL(/\/dashboard\/organizations\/[^/?]+/, { timeout: 10000 });

    await ownerPage.getByTestId('organization-member-create-open').click();
    await expect(ownerPage.getByTestId('organization-member-email-input')).toBeVisible({
        timeout: 10000,
    });
    await ownerPage.getByTestId('organization-member-email-input').fill(collaboratorUser.email);
    await ownerPage.getByTestId('organization-member-save-button').click();
    await expect(ownerPage.getByTestId('organization-member-email-input')).toBeHidden({
        timeout: 20000,
    });

    await page.goto('/dashboard/invitations');
    await page.waitForURL(/\/dashboard\/invitations(?:\?|$)/, { timeout: 15000 });
    await verifyEmailFromInvitationPage(page, collaboratorUser.email);

    const acceptButton = page.getByTestId('invitation-accept-button').first();
    await expect(acceptButton).toBeVisible({ timeout: 20000 });
    await acceptButton.click();

    await page.getByTestId('invitation-accept-confirm-button').click();

    await expect(page.getByTestId('organization-switcher')).toContainText(organizationName, {
        timeout: 20000,
    });

    await page.goto('/dashboard/home', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/home(?:\?|$)/, { timeout: 15000 });
    await expect(page.getByTestId('organization-switcher')).toContainText(organizationName, {
        timeout: 15000,
    });

    return { context, page, user: collaboratorUser, organizationName };
}
