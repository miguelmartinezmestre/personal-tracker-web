import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    ensureTestUserAuth,
} from './test.helpers';
import { runInAuth } from './authTesting';

describe('convex organizations', () => {
    const t = initConvexTest();
    let userIdentity: ReturnType<typeof t.withIdentity>;
    let organizationId: string;
    let memberUserId: string;
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
    test('getOrganizationMembers returns paginated members for authorized user @REQ-EQUIPOS-004', async () => {
        const result = await userIdentity.query(api.organizations.getOrganizationMembers, {
            organizationId,
            paginationOpts: { numItems: 20, cursor: null },
        });

        expect(result.page.length).toBe(1);
        expect(result.page[0]?.userId).toBe(memberUserId);
        expect(result.isDone).toBe(true);
    });
    test('getOrganizationPendingInvitations lists only live invitations, and only to admins @REQ-EQUIPOS-002', async () => {
        const now = Date.now();

        const insertInvitation = (email: string, status: string, expiresAt: number) =>
            runInAuth(t, async ctx =>
                ctx.db.insert('invitation', {
                    organizationId,
                    email,
                    role: 'member',
                    status,
                    expiresAt,
                    createdAt: now,
                    inviterId: memberUserId,
                })
            );

        await insertInvitation('pending@example.com', 'pending', now + 60_000);
        await insertInvitation('expired@example.com', 'pending', now - 60_000);
        await insertInvitation('accepted@example.com', 'accepted', now + 60_000);

        const asOwner = await userIdentity.query(
            api.organizations.getOrganizationPendingInvitations,
            {
                organizationId,
                paginationOpts: { numItems: 20, cursor: null },
            }
        );

        expect(asOwner.page.map(invitation => invitation.email)).toEqual(['pending@example.com']);
        expect(asOwner.isDone).toBe(true);

        await insertInvitation('later@example.com', 'pending', now + 120_000);

        const firstPage = await userIdentity.query(
            api.organizations.getOrganizationPendingInvitations,
            { organizationId, paginationOpts: { numItems: 1, cursor: null } }
        );

        expect(firstPage.page.map(invitation => invitation.email)).toEqual(['later@example.com']);
        expect(firstPage.isDone).toBe(false);

        const secondPage = await userIdentity.query(
            api.organizations.getOrganizationPendingInvitations,
            { organizationId, paginationOpts: { numItems: 1, cursor: firstPage.continueCursor } }
        );

        expect(secondPage.page.map(invitation => invitation.email)).toEqual([
            'pending@example.com',
        ]);
        expect(secondPage.isDone).toBe(true);

        const suffix = Math.random().toString(36).substring(2, 15);

        const plainMember = await createTestUser(t, {
            userId: `plain-member-${suffix}`,
            email: `plain-member-${suffix}@example.com`,
            name: 'Plain member',
        });

        await createTestMember(t, { organizationId, userId: plainMember.docId, role: 'member' });

        const asMember = await t
            .withIdentity({
                subject: plainMember.docId,
                role: 'user',
                email: plainMember.email,
                name: plainMember.name,
                emailVerified: false,
                createdAt: now,
                userId: plainMember.docId,
                image: 'https://example.com/image.png',
                banExpires: null,
                banReason: null,
                banned: false,
            })
            .query(api.organizations.getOrganizationPendingInvitations, {
                organizationId,
                paginationOpts: { numItems: 20, cursor: null },
            });

        expect(asMember.page).toEqual([]);
    });
    test('users outside the organization cannot read it or its members @REQ-NF-003', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const outsider = await createTestUser(t, {
            userId: 'organizations-outsider-' + randomSuffix,
            email: 'organizations-outsider@example.com-' + randomSuffix,
            name: 'Organizations Outsider ' + randomSuffix,
            role: 'user',
        });

        await ensureTestUserAuth(t, outsider.docId);

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
        await expect(
            outsiderIdentity.query(api.organizations.getOrganizationByIdentifier, {
                identifier: organizationId,
            })
        ).resolves.toBeNull();
    });
});
