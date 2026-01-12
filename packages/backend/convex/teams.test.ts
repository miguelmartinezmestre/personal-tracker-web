import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import {
    createTestMember,
    createTestOrganization,
    createTestUser,
    getBetterAuthDoc,
} from '../test_helpers';
import { register, runInBetterAuth } from '../better-auth.helper';
import { Id } from './_generated/dataModel';

describe('convex teams', () => {
    const t = convexTest(schema, modules);
    register(t);
    let userId: string;

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        const result = await createTestUser(t, {
            userId: 'test-user-123',
            email: 'test@example.com',
            name: 'Test User',
            password: 'test-password',
            role: 'admin',
            emailVerified: false,
        });
        userId = result.userId;
    });

    test('createTestOrganization creates an organization with correct data', async () => {
        const orgId = await createTestOrganization(t, {
            name: 'Engineering Team',
            slug: 'engineering-team',
            description: 'Our awesome engineering team',
        });
        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        const team = await getBetterAuthDoc<{
            name: string;
            slug: string;
            description: string | null;
        }>(t, orgId);

        expect(team).toBeDefined();
        expect(team?.name).toBe('Engineering Team');
        expect(team?.description).toBe('Our awesome engineering team');
        expect(team?.slug).toBe('engineering-team');
    });

    test('createTestMember adds a member to organization', async () => {
        const orgId = await createTestOrganization(t, {
            name: 'My Team',
            slug: 'my-team',
            description: 'Description',
        });
        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        const members = await runInBetterAuth(t, async ctx => {
            return await ctx.db
                .query('member')
                .withIndex('organizationId', (q: any) => q.eq('organizationId', String(orgId)))
                .collect();
        });

        expect(members).toHaveLength(1);
        expect(members[0]?.userId).toBe(userId);
        expect(members[0]?.role).toBe('owner');
    });

    test('updateTeam modifies team details', async () => {
        const orgId = await createTestOrganization(t, {
            name: 'Old Name',
            slug: 'update-team-test',
            description: 'Old Description',
        });
        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });

        const updated = await userIdentity.mutation(api.teams.updateTeam, {
            _id: orgId as Id<'organization'>,
            name: 'New Name',
            description: 'New Description',
        });

        expect(updated?.name).toBe('New Name');
        expect(updated?.description).toBe('New Description');
    });

    test('deleteTeam removes team and all members', async () => {
        const orgId = await createTestOrganization(t, {
            name: 'Team to Delete',
            slug: 'team-to-delete',
            description: 'Description',
        });
        await createTestMember(t, {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
        });
        await createTestMember(t, {
            organizationId: String(orgId),
            userId: 'other-user',
            role: 'member',
        });

        const result = await userIdentity.mutation(api.teams.deleteTeam, {
            _id: orgId as Id<'organization'>,
        });

        expect(result).toBe('Team deleted successfully');
    });

    test('createTeam rejects when unauthenticated', async () => {
        await expect(
            t.mutation(api.teams.createTeam, {
                name: 'Test',
                description: 'Test',
            })
        ).rejects.toThrow(/Unauthenticated|User not authenticated/);
    });

    test('getTeams rejects when unauthenticated', async () => {
        await expect(t.query(api.teams.getTeams, {})).rejects.toThrow(
            /Unauthenticated|User not authenticated/
        );
    });
});
