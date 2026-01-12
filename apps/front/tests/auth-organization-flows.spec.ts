import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createTestUser, loginUser } from './test-helpers';

const PASSWORD = '12345678';

/**
 * Creates an organization using BetterAuth client methods.
 * Note: Organization functionality may not be fully implemented in the current setup.
 * This test is skipped until organization features are properly configured.
 */
async function createOrganization(
    page: Page,
    data: { name: string; slug: string; description?: string }
) {
    const result = await page.evaluate(async ({ name, slug, description }) => {
        // Try to access the auth client from window
        const win = window as any;
        if (!win.authClient) {
            return { error: 'authClient not found on window' };
        }

        try {
            // Use BetterAuth organization client
            const response = await win.authClient.organization.create({
                name,
                slug,
                description,
            });
            return { success: true, data: response };
        } catch (error: any) {
            return { error: error.message || 'Unknown error' };
        }
    }, data);

    if (result.error) {
        throw new Error(`createOrganization failed: ${result.error}`);
    }

    return result.data as { id: string; name: string; slug: string };
}

/**
 * Invites a member to an organization.
 * Note: This functionality may not be fully implemented.
 */
async function inviteMember(
    page: Page,
    data: { organizationId: string; email: string; role: 'admin' | 'member' | 'owner' }
) {
    const result = await page.evaluate(async ({ organizationId, email, role }) => {
        const win = window as any;
        if (!win.authClient) {
            return { error: 'authClient not found on window' };
        }

        try {
            const response = await win.authClient.organization.inviteMember({
                organizationId,
                email,
                role,
            });
            return { success: true, data: response };
        } catch (error: any) {
            return { error: error.message || 'Unknown error' };
        }
    }, data);

    if (result.error) {
        throw new Error(`inviteMember failed: ${result.error}`);
    }

    return result.data as { id: string; email: string; organizationId: string };
}

/**
 * Accepts an organization invitation.
 * Note: This functionality may not be fully implemented.
 */
async function acceptInvitation(page: Page, invitationId: string) {
    const result = await page.evaluate(async ({ invitationId: id }) => {
        const win = window as any;
        if (!win.authClient) {
            return { error: 'authClient not found on window' };
        }

        try {
            const response = await win.authClient.organization.acceptInvitation({
                invitationId: id,
            });
            return { success: true, data: response };
        } catch (error: any) {
            return { error: error.message || 'Unknown error' };
        }
    }, { invitationId });

    if (result.error) {
        throw new Error(`acceptInvitation failed: ${result.error}`);
    }

    return result.data as {
        invitation: { id: string; status: string };
        member: { id: string; organizationId: string; userId: string; role: string };
    };
}

/**
 * Lists members of an organization.
 * Note: This functionality may not be fully implemented.
 */
async function listMembers(page: Page, organizationId: string) {
    const result = await page.evaluate(async ({ organizationId: orgId }) => {
        const win = window as any;
        if (!win.authClient) {
            return { error: 'authClient not found on window' };
        }

        try {
            const response = await win.authClient.organization.listMembers({
                organizationId: orgId,
            });
            return { success: true, data: response };
        } catch (error: any) {
            return { error: error.message || 'Unknown error' };
        }
    }, { organizationId });

    if (result.error) {
        throw new Error(`listMembers failed: ${result.error}`);
    }

    const data = result.data as {
        members: Array<{ user: { email: string } }>;
        total: number;
    };

    return data.members;
}

test.skip('admin invita a un usuario y el invitado invita a otros miembros', async ({ browser }) => {
    test.skip(true, 'Organization functionality not fully implemented yet');
    const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';

    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();

    const invitedContext = await browser.newContext({ baseURL });
    const invitedPage = await invitedContext.newPage();

    const memberContext = await browser.newContext({ baseURL });
    const memberPage = await memberContext.newPage();

    try {
        const adminUser = await createTestUser(adminPage);

        const orgName = `org-${randomUUID()}`;
        const orgSlug = `org-${randomUUID()}`;
        const organization = await createOrganization(adminPage, {
            name: orgName,
            slug: orgSlug,
            description: 'Org creada para pruebas de invitación',
        });

        const invitedUser = await createTestUser(invitedPage);
        const invitation = await inviteMember(adminPage, {
            organizationId: organization.id,
            email: invitedUser.email,
            role: 'admin',
        });

        const accepted = await acceptInvitation(invitedPage, invitation.id);
        expect(accepted?.member?.organizationId).toBe(organization.id);

        const memberUser = await createTestUser(memberPage);
        const invitation2 = await inviteMember(invitedPage, {
            organizationId: organization.id,
            email: memberUser.email,
            role: 'member',
        });

        const accepted2 = await acceptInvitation(memberPage, invitation2.id);
        expect(accepted2?.member?.organizationId).toBe(organization.id);

        const members = await listMembers(adminPage, organization.id);
        const memberEmails = members.map(member => member.user.email);

        expect(memberEmails).toContain(adminUser.email);
        expect(memberEmails).toContain(invitedUser.email);
        expect(memberEmails).toContain(memberUser.email);
    } finally {
        await adminContext.close();
        await invitedContext.close();
        await memberContext.close();
    }
});

test.skip('usuario puede borrar su cuenta', async ({ page }) => {
    test.skip(true, 'User deletion endpoint not implemented yet');
    const { email } = await createTestUser(page);

    const result = await page.evaluate(async ({ password }) => {
        const win = window as any;
        if (!win.authClient) {
            return { error: 'authClient not found on window' };
        }

        try {
            const response = await win.authClient.deleteUser({
                password,
            });
            return { success: true, data: response };
        } catch (error: any) {
            return { error: error.message || 'Unknown error' };
        }
    }, { password: PASSWORD });

    if (result.error) {
        throw new Error(`deleteUser failed: ${result.error}`);
    }

    await page.goto('/dashboard/home');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/login');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(PASSWORD);
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL(/\/login$/);
});
