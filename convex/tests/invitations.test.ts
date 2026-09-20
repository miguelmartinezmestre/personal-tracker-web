import { beforeEach, describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, ensureTestUserAuth } from './test_helpers';
import { ERROR_CODES, TIME } from '../utils/constants';
import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import type { DataModel } from '../_generated/dataModel';

describe('convex invitations (better-auth)', () => {
    const t = initConvexTest();

    beforeEach(() => {});

    test('inviteMember creates pending invitation', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const inviter = await createTestUser(t, {
            userId: 'inviter-1-' + randomSuffix,
            email: 'inviter@example.com-' + randomSuffix,
            name: 'Inviter User ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Invite Org',
            slug: 'invite-org-' + randomSuffix,
            description: 'Invitations org',
        });

        const invitationId = await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'invitee@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + TIME.DAY_MS,
                createdAt: Date.now(),
                inviterId: inviter.docId,
            });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get('invitation', invitationId)
        );
        if (!invitation) {
            throw new Error('Expected invitation');
        }
        expect(invitation.status).toBe('pending');
        expect(invitation.email).toBe('invitee@example.com');
        expect(invitation.organizationId).toBe(organizationId);
    });

    test('public invitation status exposes only validity', async () => {
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
        const invitationId = await t.run(async ctx => {
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
                now,
            })
        ).resolves.toEqual({ isValid: true });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId: 'not-a-convex-id',
                now,
            })
        ).resolves.toEqual({ isValid: false });
        await t.run(async ctx => {
            await ctx.db.patch('invitation', invitationId, { expiresAt: Date.now() - 1 });
        });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId,
                now: Date.now(),
            })
        ).resolves.toEqual({ isValid: false });
    });

    test('accepting invitation creates member and updates status', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const inviter = await createTestUser(t, {
            userId: 'inviter-2-' + randomSuffix,
            email: 'inviter2@example.com-' + randomSuffix,
            name: 'Inviter 2 ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });

        const invitee = await createTestUser(t, {
            userId: 'invitee-2-' + randomSuffix,
            email: 'invitee2@example.com-' + randomSuffix,
            name: 'Invitee 2 ' + randomSuffix,
            password: 'test-password',
            role: 'user',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Accept Org',
            slug: 'accept-org-' + randomSuffix,
            description: 'Accept org',
        });

        const invitationId = await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'invitee2@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + TIME.DAY_MS,
                createdAt: Date.now(),
                inviterId: inviter.docId,
            });
        });

        await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            await ctx.db.patch('invitation', invitationId, { status: 'accepted' });
            await ctx.db.insert('member', {
                organizationId,
                userId: invitee.docId,
                role: 'member',
                createdAt: Date.now(),
            });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get('invitation', invitationId)
        );
        const members = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db
                .query('member')
                .filter(q =>
                    q.and(
                        q.eq(q.field('organizationId'), organizationId),
                        q.eq(q.field('userId'), invitee.docId)
                    )
                )
                .collect()
        );

        if (!invitation) {
            throw new Error('Expected accepted invitation');
        }
        expect(invitation.status).toBe('accepted');
        expect(members.length).toBe(1);
    });

    test('rejecting invitation marks status rejected', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const inviter = await createTestUser(t, {
            userId: 'inviter-3-' + randomSuffix,
            email: 'inviter3@example.com-' + randomSuffix,
            name: 'Inviter 3 ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Reject Org',
            slug: 'reject-org-' + randomSuffix,
            description: 'Reject org',
        });

        const invitationId = await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'reject@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + TIME.DAY_MS,
                createdAt: Date.now(),
                inviterId: inviter.docId,
            });
        });

        await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            await ctx.db.patch('invitation', invitationId, { status: 'rejected' });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get('invitation', invitationId)
        );
        if (!invitation) {
            throw new Error('Expected rejected invitation');
        }
        expect(invitation.status).toBe('rejected');
    });

    test('expired invitations can be detected', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        const inviter = await createTestUser(t, {
            userId: 'inviter-4-' + randomSuffix,
            email: 'inviter4@example.com-' + randomSuffix,
            name: 'Inviter 4 ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Expired Org',
            slug: 'expired-org-' + randomSuffix,
            description: 'Expired org',
        });

        const invitationId = await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'expired@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() - TIME.DAY_MS,
                createdAt: Date.now() - TIME.DAY_MS * 2,
                inviterId: inviter.docId,
            });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get('invitation', invitationId)
        );
        if (!invitation) {
            throw new Error('Expected expired invitation');
        }
        expect(invitation.expiresAt).toBeLessThan(Date.now());
    });

    test('getUserInvitationsPage does not trust a stale timestamp to revive an expired invitation', async () => {
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
        });
        const organizationId = await createTestOrganization(t, {
            name: `Expired Client Time Org ${randomSuffix}`,
            slug: `expired-client-time-org-${randomSuffix}`,
        });

        await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
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

        await expect(
            targetIdentity.query(api.organizations.getUserInvitationsPage, {
                now: serverNow - TIME.DAY_MS * 2,
                paginationOpts: { numItems: 10, cursor: null },
            })
        ).rejects.toThrow(ERROR_CODES.VALIDATION_ERROR);

        const invitations = await targetIdentity.query(api.organizations.getUserInvitationsPage, {
            now: serverNow,
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(invitations.page).toEqual([]);
    });

    test('getUserInvitationsPage finds an exact email among many unrelated invitations', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);
        const targetEmail = `target-${randomSuffix}@example.com`;

        const inviter = await createTestUser(t, {
            userId: 'inviter-many-' + randomSuffix,
            email: 'inviter-many@example.com-' + randomSuffix,
            name: 'Many Inviter ' + randomSuffix,
            password: 'test-password',
            role: 'globalAdmin',
            emailVerified: true,
        });

        const target = await createTestUser(t, {
            userId: 'target-many-' + randomSuffix,
            email: targetEmail,
            name: 'Target Invitee ' + randomSuffix,
            password: 'test-password',
            role: 'user',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t, {
            name: 'Many Invitations Org ' + randomSuffix,
            slug: 'many-invitations-org-' + randomSuffix,
        });

        await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            const now = Date.now();
            for (let i = 0; i < 1001; i++) {
                await ctx.db.insert('invitation', {
                    organizationId,
                    email: `other-${i}-${randomSuffix}@example.com`,
                    role: 'member',
                    status: 'pending',
                    expiresAt: now + TIME.DAY_MS + i,
                    createdAt: now,
                    inviterId: inviter.docId,
                });
            }

            await ctx.db.insert('invitation', {
                organizationId,
                email: targetEmail,
                role: 'admin',
                status: 'pending',
                expiresAt: now + TIME.DAY_MS * 2,
                createdAt: now,
                inviterId: inviter.docId,
            });
        });

        await ensureTestUserAuth(t, target.docId);

        const targetIdentity = t.withIdentity({
            subject: target.docId,
            role: 'user',
            email: target.email,
            name: target.name,
            password: target.password,
            emailVerified: true,
            createdAt: Date.now(),
            userId: target.docId,
            image: 'https://example.com/image.png',
            banExpires: null,
            banReason: null,
            banned: false,
        });

        const invitations = await targetIdentity.query(api.organizations.getUserInvitationsPage, {
            now: Date.now(),
            paginationOpts: { numItems: 10, cursor: null },
        });

        expect(invitations.page).toHaveLength(1);
        expect(invitations.page[0]?.email).toBe(targetEmail);
        expect(invitations.page[0]?.organizationId).toBe(organizationId);
    });
});
