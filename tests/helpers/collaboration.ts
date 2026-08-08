import { Browser, BrowserContext, Page, expect } from '@playwright/test';
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
    const suffix = Date.now().toString(36);
    const organizationName = options?.organizationName ?? `Collab Org ${suffix}`;

    const context = await browser.newContext();
    const page = await context.newPage();

    const collaboratorUser = await createTestUser(page, {
        usePresentableName: true,
    });
    // Keep the secondary session alive without leaving a full dashboard worth of
    // reactive queries subscribed while the owner creates and sends the invite.
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
    // FormModal only closes after the invite mutation succeeds. Checking this at
    // the source gives a useful failure instead of timing out on the recipient page.
    await expect(ownerPage.getByTestId('organization-member-email-input')).toBeHidden({
        timeout: 20000,
    });

    await page.goto('/dashboard/invitations');
    await page.waitForURL(/\/dashboard\/invitations(?:\?|$)/, { timeout: 15000 });

    await expect(
        page.getByTestId('invitations-list').or(page.getByTestId('invitations-empty'))
    ).toBeVisible({ timeout: 20000 });
    await verifyEmailFromInvitationPage(page, collaboratorUser.email);

    const acceptButton = page.getByTestId('invitation-accept-button').first();
    await expect(acceptButton).toBeVisible({ timeout: 20000 });
    await acceptButton.click();

    await page.getByTestId('invitation-accept-confirm-button').click();

    await expect(acceptButton).toBeHidden({ timeout: 20000 });

    await page.goto('/dashboard/home');
    await page.waitForURL(/\/dashboard\/home(?:\?|$)/, { timeout: 15000 });

    return { context, page, user: collaboratorUser, organizationName };
}

export async function openCollaboratorsDialog(page: Page, objectiveTitle: string): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

    const row = page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const openButton = row.getByTestId('objective-collaborators-open');
    const memberSelect = page.getByTestId('collaborator-member-select');

    // The objectives list keeps re-rendering while its background queries settle right after
    // an objective is created. That re-render unmounts the freshly opened dialog, so we open
    // it, let the network settle, and confirm it is still open before handing control back.
    // A re-open hits the now-cached queries and stays open.
    for (let attempt = 0; attempt < 6; attempt++) {
        await expect(openButton).toBeVisible({ timeout: 5000 });
        await openButton.click();

        try {
            await expect(memberSelect).toBeVisible({ timeout: 5000 });
        } catch {
            await page.keyboard.press('Escape').catch(() => undefined);
            continue;
        }

        await page.waitForLoadState('networkidle').catch(() => undefined);
        await page.waitForTimeout(400);

        if (await memberSelect.isVisible().catch(() => false)) {
            return;
        }
    }

    throw new Error(`Could not open collaborators dialog for objective "${objectiveTitle}"`);
}

export function collaboratorRowFilter(page: Page, member: TestUserData) {
    return page
        .getByTestId('collaborator-row')
        .filter({ hasText: new RegExp(`${member.username}|${member.email}`, 'i') })
        .first();
}

export async function addCollaboratorFromDialog(
    page: Page,
    member: TestUserData,
    role: 'editor' | 'viewer'
): Promise<void> {
    await page.getByTestId('collaborator-member-select').click();
    const option = page
        .getByRole('option')
        .filter({ hasText: new RegExp(`${member.username}|${member.email}`, 'i') })
        .first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    await page.getByTestId('collaborator-add-role-select').click();
    await page
        .getByRole('option', { name: new RegExp(role, 'i') })
        .first()
        .click();

    await page.getByTestId('collaborator-add-button').click();

    await expect(collaboratorRowFilter(page, member)).toBeVisible({ timeout: 10000 });
}

export async function changeCollaboratorRole(
    page: Page,
    member: TestUserData,
    role: 'editor' | 'viewer'
): Promise<void> {
    const row = collaboratorRowFilter(page, member);
    const roleSelect = row.getByTestId('collaborator-row-role-select');

    for (let attempt = 0; attempt < 3; attempt++) {
        await roleSelect.click();
        await page
            .getByRole('option', { name: new RegExp(role, 'i') })
            .first()
            .click();

        try {
            await expect(roleSelect).toContainText(new RegExp(role, 'i'), { timeout: 10000 });
            return;
        } catch {
            // Convex may reject an isolated mutation when its one-second execution budget is
            // exhausted. Retrying the same idempotent role assignment keeps this helper stable.
        }
    }

    throw new Error(`Could not change collaborator role to "${role}"`);
}

export async function removeCollaboratorFromDialog(
    page: Page,
    member: TestUserData
): Promise<void> {
    const row = collaboratorRowFilter(page, member);
    const removeButton = row.getByTestId('collaborator-remove-button');

    for (let attempt = 0; attempt < 3; attempt++) {
        await expect(removeButton).toBeEnabled({ timeout: 10000 });
        await removeButton.click();

        try {
            await expect(row).toBeHidden({ timeout: 10000 });
            return;
        } catch {
            // Retry the idempotent removal after a transient Convex execution timeout.
        }
    }

    throw new Error(`Could not remove collaborator "${member.email}"`);
}

export async function transferOwnershipToCollaborator(
    page: Page,
    member: TestUserData
): Promise<void> {
    const row = collaboratorRowFilter(page, member);
    await row.getByTestId('collaborator-make-owner-button').click();
    await page.waitForTimeout(500);
}

export async function openObjectiveProgressPage(page: Page, objectiveTitle: string): Promise<void> {
    await page.goto('/dashboard/objectives', { waitUntil: 'domcontentloaded' });

    const row = page.getByTestId('table-row').filter({ hasText: objectiveTitle }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const progressLink = row.getByTestId('objective-progress-link').first();
    const href = await progressLink.getAttribute('href');
    if (href) {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
    } else {
        await progressLink.click();
        await page.waitForURL(/\/dashboard\/objectives\/.+/, { timeout: 10000 });
    }

    await expect(page.getByTestId('objective-progress-layout')).toBeVisible({ timeout: 10000 });
}

export async function createProgressUpdate(
    page: Page,
    value: string,
    comment: string
): Promise<void> {
    await page.getByTestId('progress-create-open').click();
    await expect(page.getByTestId('progress-value-input')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('progress-value-input').fill(value);
    await page.getByTestId('progress-comment-input').fill(comment);
    await page.getByTestId('progress-save-button').click();

    await expect(page.getByTestId('progress-value-input')).toHaveCount(0, { timeout: 10000 });
}
