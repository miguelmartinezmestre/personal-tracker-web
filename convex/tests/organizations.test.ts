import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestMember, createTestOrganization, createTestUser } from './test_helpers';
import { Id } from '../_generated/dataModel';

describe('convex organizations', () => {
    const t = initConvexTest();
    let userIdentity: ReturnType<typeof t.withIdentity>;
    let organizationId: Id<'organization'>;
    let memberUserId: Id<'user'>;

    beforeEach(async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const user = {
            userId: 'test-user-organizations-' + randomSuffix,
            email: 'organizations-test@example.com-' + randomSuffix,
            name: 'Organizations Test User ' + randomSuffix,
            password: 'test-password',
            role: 'user',
            emailVerified: false,
        };

        const userData = await createTestUser(t, user);
        memberUserId = userData.docId;

        organizationId = await createTestOrganization(t, {
            name: 'Organizations Test Org ' + randomSuffix,
            slug: 'organizations-test-org-' + randomSuffix,
        });

        await createTestMember(t, {
            organizationId,
            userId: memberUserId,
            role: 'owner',
        });

        userIdentity = t.withIdentity({
            subject: userData.docId,
            role: user.role,
            email: user.email,
            name: user.name,
            password: user.password,
            emailVerified: user.emailVerified,
            createdAt: Date.now(),
            userId: userData.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });
    });

    test('getOrganizationMembers returns paginated members for authorized user', async () => {
        const result = await userIdentity.query(api.organizations.getOrganizationMembers, {
            organizationId,
            paginationOpts: { numItems: 20, cursor: null },
        });

        expect(Array.isArray(result.page)).toBe(true);
        expect(result.page.length).toBe(1);
        expect(result.page[0]?.userId).toBe(memberUserId);
        expect(result.isDone).toBe(true);
        expect(typeof result.continueCursor).toBe('string');
    });

    test('getOrganizationMembers rejects unauthenticated users', async () => {
        await expect(
            t.query(api.organizations.getOrganizationMembers, {
                organizationId,
                paginationOpts: { numItems: 20, cursor: null },
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated|AUTH_REQUIRED/);
    });

    test('getOrganizationMembers rejects users outside the organization', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const outsider = await createTestUser(t, {
            userId: 'organizations-outsider-' + randomSuffix,
            email: 'organizations-outsider@example.com-' + randomSuffix,
            name: 'Organizations Outsider ' + randomSuffix,
            role: 'user',
        });
        const outsiderIdentity = t.withIdentity({
            subject: outsider.docId,
            role: outsider.role ?? 'user',
            email: outsider.email,
            name: outsider.name,
            emailVerified: false,
            createdAt: Date.now(),
            userId: outsider.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        await expect(
            outsiderIdentity.query(api.organizations.getOrganizationMembers, {
                organizationId,
                paginationOpts: { numItems: 20, cursor: null },
            })
        ).rejects.toThrow(/FORBIDDEN|Forbidden|Not authorized/i);
    });

    test('organization owners can list and expire invitations', async () => {
        const invitationId = await t.run(async ctx => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'pending-member@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + 60_000,
                createdAt: Date.now(),
                inviterId: memberUserId,
            });
        });

        const invitations = await userIdentity.query(api.organizations.getOrganizationInvitations, {
            organizationId,
        });

        expect(invitations).toHaveLength(1);
        expect(invitations[0]?.id).toBe(invitationId);

        await userIdentity.mutation(api.organizations.expireInvitation, {
            organizationId,
            invitationId,
        });

        const expiredInvitation = await t.run(async ctx => {
            return await ctx.db.get(invitationId);
        });

        expect(expiredInvitation?.status).toBe('cancelled');
        expect(expiredInvitation?.expiresAt).toBe(0);
    });

    test('users outside the organization cannot list invitations', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const outsider = await createTestUser(t, {
            userId: 'organizations-invite-outsider-' + randomSuffix,
            email: 'organizations-invite-outsider@example.com-' + randomSuffix,
            name: 'Organizations Invite Outsider ' + randomSuffix,
            role: 'user',
        });
        const outsiderIdentity = t.withIdentity({
            subject: outsider.docId,
            role: outsider.role ?? 'user',
            email: outsider.email,
            name: outsider.name,
            emailVerified: false,
            createdAt: Date.now(),
            userId: outsider.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        await t.run(async ctx => {
            await ctx.db.insert('invitation', {
                organizationId,
                email: 'pending-outsider-check@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + 60_000,
                createdAt: Date.now(),
                inviterId: memberUserId,
            });
        });

        await expect(
            outsiderIdentity.query(api.organizations.getOrganizationInvitations, {
                organizationId,
            })
        ).rejects.toThrow(/FORBIDDEN|Forbidden|Not authorized/i);
    });
});
