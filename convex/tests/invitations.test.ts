import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, ensureTestUserAuth } from './test.helpers';
import { TIME } from './test.helpers';
import { runInAuth } from './authTesting';

describe('convex invitations (better-auth)', () => {
    const t = initConvexTest();

    test('public invitation status exposes only validity and the organization name @REQ-EQUIPOS-006 @INH-ORG-07', async () => {
        const now = Date.now();

        const inviter = await createTestUser(t, {
            userId: `public-inviter-${now}`,
            email: `public-inviter-${now}@example.com`,
            name: 'Public invitation inviter',
        });

        const organizationId = await createTestOrganization(t, {
            name: `Public invitation org ${now}`,
            slug: `public-invitation-org-${now}`,
        });

        const invitationId = await runInAuth(t, async ctx => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'private-invitee@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: now + TIME.DAY_MS,
                createdAt: now,
                inviterId: inviter.docId,
            });
        });

        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId,
            })
        ).resolves.toEqual({
            isValid: true,
            organizationName: `Public invitation org ${now}`,
        });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId: 'not-a-convex-id',
            })
        ).resolves.toEqual({ isValid: false });
        await runInAuth(t, async ctx => {
            await ctx.db.patch('invitation', invitationId, { expiresAt: Date.now() - 1 });
        });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId,
            })
        ).resolves.toEqual({ isValid: false });
    });

    test('getUserInvitations hides expired invitations @REQ-EQUIPOS-005 @INH-ORG-07', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const targetEmail = `expired-target-${randomSuffix}@example.com`;
        const serverNow = Date.now();

        const inviter = await createTestUser(t, {
            userId: `expired-inviter-${randomSuffix}`,
            email: `expired-inviter-${randomSuffix}@example.com`,
            name: 'Expired invitation inviter',
            role: 'globalAdmin',
        });

        const target = await createTestUser(t, {
            userId: `expired-target-${randomSuffix}`,
            email: targetEmail,
            name: 'Expired invitation target',
            role: 'user',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: `Expired Client Time Org ${randomSuffix}`,
            slug: `expired-client-time-org-${randomSuffix}`,
        });

        await runInAuth(t, async ctx => {
            await ctx.db.insert('invitation', {
                organizationId,
                email: targetEmail,
                role: 'member',
                status: 'pending',
                expiresAt: serverNow - TIME.DAY_MS,
                createdAt: serverNow - TIME.DAY_MS * 2,
                inviterId: inviter.docId,
            });
        });

        await ensureTestUserAuth(t, target.docId);

        const targetIdentity = t.withIdentity({
            subject: target.docId,
            role: 'user',
            email: target.email,
            name: target.name,
            emailVerified: true,
            createdAt: serverNow,
            userId: target.docId,
        });

        const invitations = await targetIdentity
            .query(api.organizations.getUserInvitations, {
                paginationOpts: { numItems: 20, cursor: null },
            })
            .then(result => result.page);

        expect(invitations).toEqual([]);
    });

    test('an account sees its invitations only once its email is verified @REQ-EQUIPOS-006 @INH-ORG-08', async () => {
        const suffix = Math.random().toString(36).substring(2, 10);
        const email = `unverified-${suffix}@example.com`;

        const inviter = await createTestUser(t, {
            userId: `unverified-inviter-${suffix}`,
            email: `unverified-inviter-${suffix}@example.com`,
            name: 'Inviter',
        });

        const claimant = await createTestUser(t, {
            userId: `unverified-claimant-${suffix}`,
            email,
            name: 'Claimant',
            emailVerified: false,
        });

        const organizationId = await createTestOrganization(t, {
            name: `Unverified org ${suffix}`,
            slug: `unverified-org-${suffix}`,
        });

        const invitationId = await runInAuth(t, async ctx => {
            const now = Date.now();

            return await ctx.db.insert('invitation', {
                organizationId,
                email,
                role: 'member',
                status: 'pending',
                expiresAt: now + TIME.DAY_MS,
                createdAt: now,
                inviterId: inviter.docId,
                requireEmailVerification: true,
            });
        });

        await ensureTestUserAuth(t, claimant.docId);

        const listInvitations = (emailVerified: boolean) =>
            t
                .withIdentity({
                    subject: claimant.docId,
                    email,
                    userId: claimant.docId,
                    emailVerified,
                })
                .query(api.organizations.getUserInvitations, {
                    paginationOpts: { numItems: 20, cursor: null },
                })
                .then(result => result.page.map(invitation => invitation.id));

        expect(await listInvitations(false)).toEqual([]);

        await runInAuth(t, ctx => ctx.db.patch('user', claimant.docId, { emailVerified: true }));

        expect(await listInvitations(true)).toEqual([invitationId]);
    });
});
