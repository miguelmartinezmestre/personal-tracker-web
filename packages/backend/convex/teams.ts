import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS, BetterAuthDataModel } from './rls';
import { authComponent } from './auth';
import { components } from './_generated/api';

export const createTeam = mutationWithRLS({
    args: {
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx).catch(() => null);
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

            await ctx.runQuery(
                components.betterAuth.adapter.findOne, {
                model: "organization",
                where: [{ field: "slug", value: slug }],
            }
            ) as BetterAuthDataModel["organization"]["document"] | null
        ) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Create organization directly in database
        const orgId = await ctx.runMutation(
            components.betterAuth.adapter.create,
            {
                input: {
                    data: {
                        name: args.name,
                        slug: slug,
                        description: args.description,
                        createdAt: now,
                    },
                    model: "organization",
                },
            }
        );

        // Add creator as owner (better-auth uses "owner" as the default role for creators)
        await ctx.runMutation(
            components.betterAuth.adapter.create,
            {
                input: {
                    data: {
                        organizationId: String(orgId),
                        userId: userId,
                        role: 'owner',
                        createdAt: now,
                    },
                    model: "member",
                },
            }
        );

        return await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
                model: "organization",
                where: [{ field: "_id", value: orgId }],
            }
        ) as BetterAuthDataModel["organization"]["document"];
    },
});

export const getTeams = queryWithRLS({
    args: {},
    handler: async ctx => {
        const user = await authComponent.getAuthUser(ctx).catch(() => null);
        if (!user || !user._id) throw new Error('User not authenticated');

        const userId = user.userId || String(user._id);

        // Get all organizations where user is a member
        const memberships = await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
                model: "member",
                where: [{ field: "userId", value: userId }],
                paginationOpts: {
                    cursor: null,
                    numItems: 10,
                },
            }
        ) as BetterAuthDataModel["member"]["document"][];

        // Get all organizations - the RLS will filter based on membership
        const allOrgs = await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
                model: "organization",
                paginationOpts: {
                    cursor: null,
                    numItems: 10,
                },
            }
        ) as BetterAuthDataModel["organization"]["document"][];

        // Filter to only organizations where user is a member
        const orgIds = new Set(memberships.map(m => String(m._id)));
        return allOrgs.filter(org => orgIds.has(String(org._id)));
    },
});

export const getTeamById = queryWithRLS({
    args: { _id: v.id('organization') },
    handler: async (ctx, args) => {
        return await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
                model: "organization",
                where: [{ field: "_id", value: args._id }],
            }
        ) as BetterAuthDataModel["organization"]["document"];
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
        await ctx.runMutation(
            components.betterAuth.adapter.updateOne,
            {
                input: {
                    model: "organization",
                    update: {
                        name: rest.name,
                        description: rest.description,
                    },
                    where: [{ field: "_id", value: _id }],
                },
            }
        );
        return await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
                model: "organization",
                where: [{ field: "_id", value: _id }],
            }
        ) as BetterAuthDataModel["organization"]["document"];
    },
});

export const deleteTeam = mutationWithRLS({
    args: { _id: v.id('organization') },
    handler: async (ctx, args) => {
        // Delete all members first

        await ctx.runMutation(
            components.betterAuth.adapter.deleteMany,
            {
                input: {
                    model: "member",
                    where: [{ field: "organizationId", value: String(args._id) }],
                },
                paginationOpts: {
                    cursor: null,
                    numItems: 1000,
                },
            }
        );

        // Delete the organization
        await ctx.runMutation(
            components.betterAuth.adapter.deleteOne,
            {
                input: {
                    model: "organization",
                    where: [{ field: "_id", value: args._id }],
                },
            }
        );
        return 'Team deleted successfully' as const;
    },
});
