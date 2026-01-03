import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { getAuthenticatedUser } from './auth';

export const createTeam = mutationWithRLS({
    args: {
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) throw new Error('User not authenticated');

        const userId = user.userId || String(user._id);
        const now = Date.now();

        // Generate slug from name
        let slug = args.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Ensure slug is unique
        let counter = 1;
        const baseSlug = slug;
        while (
            await ctx.db
                .query('organization')
                .withIndex('slug', q => q.eq('slug', slug))
                .first()
        ) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Create organization directly in database
        const orgId = await ctx.db.insert('organization', {
            name: args.name,
            slug: slug,
            description: args.description,
            createdAt: now,
        });

        // Add creator as owner (better-auth uses "owner" as the default role for creators)
        await ctx.db.insert('member', {
            organizationId: String(orgId),
            userId: userId,
            role: 'owner',
            createdAt: now,
        });

        return await ctx.db.get(orgId);
    },
});

export const getTeams = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) throw new Error('User not authenticated');

        const userId = user.userId || String(user._id);

        // Get all organizations where user is a member
        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .collect();

        // Get all organizations - the RLS will filter based on membership
        const allOrgs = await ctx.db.query('organization').collect();

        // Filter to only organizations where user is a member
        const orgIds = new Set(memberships.map(m => m.organizationId));
        return allOrgs.filter(org => orgIds.has(String(org._id)));
    },
});

export const getTeamById = queryWithRLS({
    args: { _id: v.id('organization') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args._id);
    },
});

export const updateTeam = mutationWithRLS({
    args: {
        _id: v.id('organization'),
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const { _id, ...rest } = args;
        await ctx.db.patch(_id, {
            name: rest.name,
            description: rest.description,
        });
        return await ctx.db.get(_id);
    },
});

export const deleteTeam = mutationWithRLS({
    args: { _id: v.id('organization') },
    handler: async (ctx, args) => {
        // Delete all members first
        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', String(args._id)))
            .collect();

        for (const member of members) {
            await ctx.db.delete(member._id);
        }

        // Delete the organization
        await ctx.db.delete(args._id);
        return 'Team deleted successfully' as const;
    },
});
