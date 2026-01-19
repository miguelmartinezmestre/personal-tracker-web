import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import schema from '../schema';
import { modules } from '../../test.setup';
import { register, runInBetterAuth } from '../../better-auth.helper';
import { createTestUser, createTestOrganization } from '../../test_helpers';
import type { ComponentRunner } from '../../better-auth.helper';

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
    let t: ReturnType<typeof convexTest>;

    beforeEach(() => {
        t = convexTest(schema, modules);
        register(t);
    });

    test('inviteMember creates pending invitation', async () => {
        await createTestUser(t as unknown as Parameters<typeof createTestUser>[0], {
            userId: 'inviter-1',
            email: 'inviter@example.com',
            name: 'Inviter User',
            role: 'admin',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t as unknown as ComponentRunner, {
            name: 'Invite Org',
            slug: 'invite-org',
            description: 'Invitations org',
        });

        const invitationId = await runInBetterAuth(t as unknown as ComponentRunner, async ctx => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'invitee@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + DAY_MS,
                createdAt: Date.now(),
                inviterId: 'inviter-1',
            });
        });

        const invitation = await runInBetterAuth(t as unknown as ComponentRunner, async ctx =>
            ctx.db.get(invitationId)
        );
        const record = invitation as InvitationRecord;
        expect(record).not.toBeNull();
        expect(record.status).toBe('pending');
        expect(record.email).toBe('invitee@example.com');
        expect(record.organizationId).toBe(organizationId);
    });

    test('accepting invitation creates member and updates status', async () => {
        await createTestUser(t as unknown as Parameters<typeof createTestUser>[0], {
            userId: 'inviter-2',
            email: 'inviter2@example.com',
            name: 'Inviter 2',
            role: 'admin',
            emailVerified: true,
        });

        await createTestUser(t as unknown as Parameters<typeof createTestUser>[0], {
            userId: 'invitee-2',
            email: 'invitee2@example.com',
            name: 'Invitee 2',
            role: 'user',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t as unknown as ComponentRunner, {
            name: 'Accept Org',
            slug: 'accept-org',
            description: 'Accept org',
        });

        const invitationId = await runInBetterAuth(t as unknown as ComponentRunner, async ctx => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'invitee2@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + DAY_MS,
                createdAt: Date.now(),
                inviterId: 'inviter-2',
            });
        });

        await runInBetterAuth(t as unknown as ComponentRunner, async ctx => {
            await ctx.db.patch(invitationId, { status: 'accepted' });
            await ctx.db.insert('member', {
                organizationId,
                userId: 'invitee-2',
                role: 'member',
                createdAt: Date.now(),
            });
        });

        const invitation = await runInBetterAuth(t as unknown as ComponentRunner, async ctx =>
            ctx.db.get(invitationId)
        );
        const members = await runInBetterAuth(t as unknown as ComponentRunner, async ctx =>
            ctx.db
                .query('member')
                .withIndex('organizationId_userId', (q: any) =>
                    q.eq('organizationId', organizationId).eq('userId', 'invitee-2')
                )
                .collect()
        );

        const invitationRecord = invitation as InvitationRecord;
        const memberRecords = members as MemberRecord[];
        expect(invitationRecord.status).toBe('accepted');
        expect(memberRecords.length).toBe(1);
    });

    test('rejecting invitation marks status rejected', async () => {
        await createTestUser(t as unknown as Parameters<typeof createTestUser>[0], {
            userId: 'inviter-3',
            email: 'inviter3@example.com',
            name: 'Inviter 3',
            role: 'admin',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t as unknown as ComponentRunner, {
            name: 'Reject Org',
            slug: 'reject-org',
            description: 'Reject org',
        });

        const invitationId = await runInBetterAuth(t as unknown as ComponentRunner, async ctx => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'reject@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() + DAY_MS,
                createdAt: Date.now(),
                inviterId: 'inviter-3',
            });
        });

        await runInBetterAuth(t as unknown as ComponentRunner, async ctx => {
            await ctx.db.patch(invitationId, { status: 'rejected' });
        });

        const invitation = await runInBetterAuth(t as unknown as ComponentRunner, async ctx =>
            ctx.db.get(invitationId)
        );
        const record = invitation as InvitationRecord;
        expect(record.status).toBe('rejected');
    });

    test('expired invitations can be detected', async () => {
        await createTestUser(t as unknown as Parameters<typeof createTestUser>[0], {
            userId: 'inviter-4',
            email: 'inviter4@example.com',
            name: 'Inviter 4',
            role: 'admin',
            emailVerified: true,
        });

        const organizationId = await createTestOrganization(t as unknown as ComponentRunner, {
            name: 'Expired Org',
            slug: 'expired-org',
            description: 'Expired org',
        });

        const invitationId = await runInBetterAuth(t as unknown as ComponentRunner, async ctx => {
            return await ctx.db.insert('invitation', {
                organizationId,
                email: 'expired@example.com',
                role: 'member',
                status: 'pending',
                expiresAt: Date.now() - DAY_MS,
                createdAt: Date.now() - DAY_MS * 2,
                inviterId: 'inviter-4',
            });
        });

        const invitation = await runInBetterAuth(t as unknown as ComponentRunner, async ctx =>
            ctx.db.get(invitationId)
        );
        const record = invitation as InvitationRecord;
        expect(record.expiresAt).toBeLessThan(Date.now());
    });
});
