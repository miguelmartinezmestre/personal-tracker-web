import { convexTest } from 'convex-test';
import { describe, expect, test, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import { modules } from '../test.setup';
import { createTestUser } from './test_helpers';

describe('convex teams', () => {
    const t = convexTest(schema, modules);
    let userId: string;

    const userIdentity = t.withIdentity({
        subject: 'test-user-123',
        role: 'admin',
    });

    beforeEach(async () => {
        // Create a complete test user with account (similar to better-auth sign-up)
        const result = await userIdentity.run(async ctx => {
            return await createTestUser(ctx, {
                userId: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
                password: 'test-password',
                role: 'admin',
                emailVerified: false,
            });
        });
        userId = result.userId;
    });

    test('createTeam creates a new team with slug', async () => {
        const team = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Engineering Team',
            description: 'Our awesome engineering team',
        });

        expect(team).toBeDefined();
        expect(team?.name).toBe('Engineering Team');
        expect(team?.description).toBe('Our awesome engineering team');
        expect(team?.slug).toBe('engineering-team');
    });

    test('createTeam generates unique slugs', async () => {
        const team1 = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Test Team',
            description: 'First team',
        });

        const team2 = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Test Team',
            description: 'Second team',
        });

        expect(team1?.slug).toBe('test-team');
        expect(team2?.slug).toBe('test-team-1');
    });

    test('createTeam adds creator as owner', async () => {
        const team = await userIdentity.mutation(api.teams.createTeam, {
            name: 'My Team',
            description: 'Description',
        });

        expect(team).toBeDefined();
        const members = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('member')
                .withIndex('organizationId', q => q.eq('organizationId', String(team!._id)))
                .collect();
        });

        expect(members).toHaveLength(1);
        expect(members[0]?.userId).toBe(userId);
        expect(members[0]?.role).toBe('owner');
    });

    test('getTeams returns teams where user is a member', async () => {
        // Get initial count to account for teams from other tests
        const initialTeams = await userIdentity.query(api.teams.getTeams, {});
        const initialCount = initialTeams.length;

        const team1 = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Team 1',
            description: 'Description 1',
        });

        const team2 = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Team 2',
            description: 'Description 2',
        });

        const teams = await userIdentity.query(api.teams.getTeams, {});

        expect(teams).toHaveLength(initialCount + 2);
        expect(team1).toBeDefined();
        expect(team2).toBeDefined();
        expect(teams.map(team => team._id)).toContain(team1!._id);
        expect(teams.map(team => team._id)).toContain(team2!._id);
    });

    test('getTeamById returns a specific team', async () => {
        const team = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Test Team',
            description: 'Test Description',
        });

        expect(team).toBeDefined();
        const retrieved = await userIdentity.query(api.teams.getTeamById, {
            _id: team!._id,
        });

        expect(retrieved?._id).toBe(team!._id);
        expect(retrieved?.name).toBe('Test Team');
    });

    test('updateTeam modifies team details', async () => {
        const team = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Old Name',
            description: 'Old Description',
        });

        expect(team).toBeDefined();
        const updated = await userIdentity.mutation(api.teams.updateTeam, {
            _id: team!._id,
            name: 'New Name',
            description: 'New Description',
        });

        expect(updated?.name).toBe('New Name');
        expect(updated?.description).toBe('New Description');
    });

    test('deleteTeam removes team and all members', async () => {
        const team = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Team to Delete',
            description: 'Description',
        });

        expect(team).toBeDefined();
        // Add another member
        await userIdentity.run(async ctx => {
            await ctx.db.insert('member', {
                organizationId: String(team!._id),
                userId: 'other-user',
                role: 'member',
                createdAt: Date.now(),
            });
        });

        const result = await userIdentity.mutation(api.teams.deleteTeam, {
            _id: team!._id,
        });

        expect(result).toBe('Team deleted successfully');

        const deleted = await userIdentity.run(async ctx => ctx.db.get(team!._id));
        expect(deleted).toBeNull();

        const members = await userIdentity.run(async ctx => {
            return await ctx.db
                .query('member')
                .withIndex('organizationId', q => q.eq('organizationId', String(team!._id)))
                .collect();
        });
        expect(members).toHaveLength(0);
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

    test('createTeam handles special characters in name', async () => {
        const team = await userIdentity.mutation(api.teams.createTeam, {
            name: 'Team @#$%^&*()!',
            description: 'Description',
        });

        // When name has special characters, they are removed/replaced
        // The slug should be non-empty and match the pattern
        expect(team?.slug).toBeDefined();
        expect(team?.slug.length).toBeGreaterThan(0);
        // Slug should match pattern: lowercase alphanumeric with hyphens
        // Can be "team" or "team-1", "team-2", etc. depending on uniqueness
        expect(team?.slug).toMatch(/^[a-z0-9-]+$/);
        // Should start with "team" since the name starts with "Team"
        expect(team?.slug).toMatch(/^team/);
    });
});
