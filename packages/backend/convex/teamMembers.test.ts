import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import {
    createTestMember,
    createTestOrganization,
    createTestUsers,
    getBetterAuthDoc,
} from '../test_helpers';
import { register, runInBetterAuth } from '../better-auth.helper';

describe('convex teamMembers', () => {
    const t = convexTest(schema, modules);
    register(t);
    let userId: string;
    let teamId: string;
    let otherUserId: string;

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        // Create complete test users with accounts
        const results = await createTestUsers(t, [
            { userId: 'test-user-123', email: 'test@example.com', name: 'Test User', password: 'test-password', role: 'admin', emailVerified: false },
            { userId: 'other-user-456', email: 'other@example.com', name: 'other User', password: 'test-password', emailVerified: false },
        ]);
        userId = results[0]!.userId;
        otherUserId = results[1]!.userId;

        const orgId = await createTestOrganization(t, {
            name: 'Test Team',
            slug: 'test-team',
            description: 'Test Description',
        });
        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });
        teamId = String(orgId);
    });

    test('createTestMember adds a member to organization', async () => {
        const memberId = await createTestMember(t, {
            organizationId: teamId,
            userId: otherUserId,
            role: 'member',
        });

        const member = await getBetterAuthDoc<{ userId: string; role: string }>(t, memberId);
        expect(member).toBeDefined();
        expect(member?.userId).toBe(otherUserId);
        expect(member?.role).toBe('member');
    });

    test('updateTeamMember changes member role', async () => {
        const memberId = await createTestMember(t, {
            organizationId: teamId,
            userId: otherUserId,
            role: 'member',
        });

        const updated = await userIdentity.mutation(api.teamMembers.updateTeamMember, {
            id: memberId,
            role: 'MANAGER',
        });

        // Verify the returned value has the correct role
        expect(updated?.role).toBe('admin');
    });

    test('deleteTeamMember removes a member', async () => {
        const memberId = await createTestMember(t, {
            organizationId: teamId,
            userId: otherUserId,
            role: 'member',
        });

        const result = await userIdentity.mutation(api.teamMembers.deleteTeamMember, {
            _id: memberId,
        });

        expect(result).toBe('Team member deleted successfully');
    });

    test('createTeamMember rejects when unauthenticated', async () => {
        await expect(
            t.mutation(api.teamMembers.createTeamMember, {
                team: teamId,
                user: otherUserId,
                role: 'MEMBER',
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });
});
