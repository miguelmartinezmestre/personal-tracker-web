import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createTestUser, getPageOrigin } from './test-helpers';

type InviteRole = 'admin' | 'member';

async function inviteMember(
    page: Page,
    organizationId: string,
    email: string,
    role: InviteRole = 'member'
) {
    const origin = getPageOrigin(page);
    const response = await page.request.post('/api/auth/organization/invite-member', {
        data: { organizationId, email, role },
        headers: { Origin: origin },
    });

    if (!response.ok()) {
        throw new Error(`inviteMember failed: ${response.status()} ${await response.text()}`);
    }

    return (await response.json()) as { id: string };
}

async function acceptInvitation(page: Page, invitationId: string) {
    const origin = getPageOrigin(page);
    const response = await page.request.post('/api/auth/organization/accept-invitation', {
        data: { invitationId },
        headers: { Origin: origin },
    });

    if (!response.ok()) {
        throw new Error(`acceptInvitation failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
}

test('team members: add, edit role, and delete team members', async ({ page, browser }) => {
    const uuid = randomUUID();
    await createTestUser(page);

    await page.goto('/dashboard/teams');
    await page.waitForLoadState('networkidle');

    const createButton = page.getByTestId('team-create-open');
    await expect(createButton).toBeVisible({ timeout: 10000 });

    await page.goto(`/dashboard/teams/${teamId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /team members|miembros/i })).toBeVisible({
        timeout: 10000,
    });
    await expect(page.getByText(invitedUser.email)).toBeVisible({ timeout: 10000 });

    const memberRow = page.locator('tr', { hasText: invitedUser.email }).first();
    await memberRow.getByRole('button', { name: /edit/i }).click();

    const dialog = page.getByRole('dialog');
    const roleTrigger = dialog.getByRole('button').first();
    await roleTrigger.click();
    await page.getByRole('option', { name: /manager|admin/i }).click();
    await dialog.getByRole('button', { name: /save|guardar/i }).click();

    await expect(memberRow).toContainText(/manager|admin|MANAGER/i);

    await memberRow.getByRole('button', { name: /delete|eliminar/i }).click();
    const deleteDialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: /confirm|delete|eliminar/i }).click();
    await expect(deleteDialog).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(invitedUser.email)).not.toBeVisible({ timeout: 10000 });
});
