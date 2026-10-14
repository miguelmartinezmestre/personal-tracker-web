import { describe, expect, test } from 'vitest';
import { api } from '../_generated/api';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization, ensureTestUserAuth } from './test.helpers';
import { TIME } from '../constants';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel } from '../_generated/dataModel';

describe('convex invitations (better-auth)', () => {
    const t = initConvexTest();

    test('public invitation status exposes only validity and the organization name', async () => {
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
            })
        ).resolves.toEqual({ isValid: true, organizationName: `Public invitation org ${now}` });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId: 'not-a-convex-id',
            })
        ).resolves.toEqual({ isValid: false });
        await t.run(async ctx => {
            await ctx.db.patch('invitation', invitationId, { expiresAt: Date.now() - 1 });
        });
        await expect(
            t.query(api.organizations.getPublicInvitationStatus, {
                invitationId,
            })
        ).resolves.toEqual({ isValid: false });
    });

    test('getUserInvitations hides expired invitations', async () => {
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

        const invitations = await targetIdentity.query(api.organizations.getUserInvitations, {});

        expect(invitations).toEqual([]);
    });

    test('getUserInvitations finds an exact email among many unrelated invitations', async () => {
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

        const invitations = await targetIdentity.query(api.organizations.getUserInvitations, {});

        expect(invitations).toHaveLength(1);
        expect(invitations[0]?.email).toBe(targetEmail);
        expect(invitations[0]?.organizationId).toBe(organizationId);
    });

    test('an unverified account sees no invitations addressed to its email', async () => {
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
        await t.run(async ctx => {
            const now = Date.now();
            await ctx.db.insert('invitation', {
                organizationId,
                email,
                role: 'member',
                status: 'pending',
                expiresAt: now + TIME.DAY_MS,
                createdAt: now,
                inviterId: inviter.docId,
            });
        });
        await ensureTestUserAuth(t, claimant.docId);
        const identity = t.withIdentity({
            subject: claimant.docId,
            email,
            userId: claimant.docId,
            emailVerified: false,
        });

        const invitations = await identity.query(api.organizations.getUserInvitations, {});
        expect(invitations).toEqual([]);
    });
});
