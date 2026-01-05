import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createTestUser, loginUser } from './test-helpers';

const PASSWORD = '12345678';

async function createOrganization(
    page: Page,
    data: { name: string; slug: string; description?: string }
) {
    const response = await page.request.post('/api/auth/organization/create', {
        data,
    });

    if (!response.ok()) {
        throw new Error(`createOrganization failed: ${response.status()} ${await response.text()}`);
    }

    return response.json() as Promise<{ id: string; name: string; slug: string }>;
}

async function inviteMember(
    page: Page,
    data: { organizationId: string; email: string; role: 'admin' | 'member' | 'owner' }
) {
    const response = await page.request.post('/api/auth/organization/invite-member', {
        data,
    });

    if (!response.ok()) {
        throw new Error(`inviteMember failed: ${response.status()} ${await response.text()}`);
    }

    return response.json() as Promise<{ id: string; email: string; organizationId: string }>;
}

async function acceptInvitation(page: Page, invitationId: string) {
    const response = await page.request.post('/api/auth/organization/accept-invitation', {
        data: { invitationId },
    });

    if (!response.ok()) {
        throw new Error(`acceptInvitation failed: ${response.status()} ${await response.text()}`);
    }

    return response.json() as Promise<{
        invitation: { id: string; status: string };
        member: { id: string; organizationId: string; userId: string; role: string };
    }>;
}

async function listMembers(page: Page, organizationId: string) {
    const response = await page.request.get('/api/auth/organization/list-members', {
        params: { organizationId },
    });

    if (!response.ok()) {
        throw new Error(`listMembers failed: ${response.status()} ${await response.text()}`);
    }

    const data = (await response.json()) as {
        members: Array<{ user: { email: string } }>;
        total: number;
    };

    return data.members;
}

test('usuario puede registrarse e iniciar sesión', async ({ page }) => {
    const { email } = await createTestUser(page);

    await page.context().clearCookies();
    await loginUser(page, email, PASSWORD);

    await expect(page).toHaveURL(/\/dashboard\/home$/);
});

test('admin invita a un usuario y el invitado invita a otros miembros', async ({ browser }) => {
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

test('usuario puede borrar su cuenta', async ({ page }) => {
    const { email } = await createTestUser(page);

    const response = await page.request.post('/api/auth/delete-user', {
        data: { password: PASSWORD },
    });

    if (!response.ok()) {
        throw new Error(`deleteUser failed: ${response.status()} ${await response.text()}`);
    }

    const payload = (await response.json()) as { success?: boolean };
    expect(payload.success).toBe(true);

    await page.goto('/dashboard/home');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/login');
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(PASSWORD);
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL(/\/login$/);
});
