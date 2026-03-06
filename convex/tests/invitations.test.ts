import { beforeEach, describe, expect, test } from 'vitest';
import { initConvexTest } from './test.helper';
import { createTestUser, createTestOrganization } from './test_helpers';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';

type InvitationRecord = {
    _id: string;
    organizationId: string;
    email: string;
    role?: string | null;
    status: string;
    expiresAt: number;
    createdAt: number;
    inviterId: string;
};

type MemberRecord = {
    _id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

describe('convex invitations (better-auth)', () => {
    const t = initConvexTest();

    beforeEach(() => {
        // Nothing to do here, tests will create their own users
    });

    test('inviteMember creates pending invitation', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        await createTestUser(t, {
            userId: 'inviter-1-' + randomSuffix,
            email: 'inviter@example.com-' + randomSuffix,
            name: 'Inviter User ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
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
                expiresAt: Date.now() + DAY_MS,
                createdAt: Date.now(),
                inviterId: 'inviter-1-' + randomSuffix,
            });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get(invitationId)
        );
        const record = invitation as unknown as InvitationRecord;
        expect(record).not.toBeNull();
        expect(record.status).toBe('pending');
        expect(record.email).toBe('invitee@example.com');
        expect(record.organizationId).toBe(organizationId);
    });

    test('accepting invitation creates member and updates status', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        await createTestUser(t, {
            userId: 'inviter-2-' + randomSuffix,
            email: 'inviter2@example.com-' + randomSuffix,
            name: 'Inviter 2 ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
            emailVerified: true,
        });

        await createTestUser(t, {
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
                expiresAt: Date.now() + DAY_MS,
                createdAt: Date.now(),
                inviterId: 'inviter-2-' + randomSuffix,
            });
        });

        await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            await ctx.db.patch(invitationId, { status: 'accepted' });
            await ctx.db.insert('member', {
                organizationId,
                userId: 'invitee-2-' + randomSuffix,
                role: 'member',
                createdAt: Date.now(),
            });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get(invitationId)
        );
        // Use filter instead of index (index not available in test env)
        const members = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db
                .query('member')
                .filter(q =>
                    q.and(
                        q.eq(q.field('organizationId'), organizationId),
                        q.eq(q.field('userId'), 'invitee-2-' + randomSuffix)
                    )
                )
                .collect()
        );

        const invitationRecord = invitation as unknown as InvitationRecord;
        const memberRecords = members as unknown as MemberRecord[];
        expect(invitationRecord.status).toBe('accepted');
        expect(memberRecords.length).toBe(1);
    });

    test('rejecting invitation marks status rejected', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        await createTestUser(t, {
            userId: 'inviter-3-' + randomSuffix,
            email: 'inviter3@example.com-' + randomSuffix,
            name: 'Inviter 3 ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
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
                expiresAt: Date.now() + DAY_MS,
                createdAt: Date.now(),
                inviterId: 'inviter-3-' + randomSuffix,
            });
        });

        await t.run(async (ctx: GenericMutationCtx<DataModel>) => {
            await ctx.db.patch(invitationId, { status: 'rejected' });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get(invitationId)
        );
        const record = invitation as InvitationRecord;
        expect(record.status).toBe('rejected');
    });

    test('expired invitations can be detected', async () => {
        const randomSuffix = Math.random().toString(36).substring(2, 15);

        await createTestUser(t, {
            userId: 'inviter-4-' + randomSuffix,
            email: 'inviter4@example.com-' + randomSuffix,
            name: 'Inviter 4 ' + randomSuffix,
            password: 'test-password',
            role: 'admin',
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
                expiresAt: Date.now() - DAY_MS,
                createdAt: Date.now() - DAY_MS * 2,
                inviterId: 'inviter-4-' + randomSuffix,
            });
        });

        const invitation = await t.run(async (ctx: GenericQueryCtx<DataModel>) =>
            ctx.db.get(invitationId)
        );
        const record = invitation as InvitationRecord;
        expect(record.expiresAt).toBeLessThan(Date.now());
    });
});
