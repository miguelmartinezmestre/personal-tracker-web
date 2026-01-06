import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS, BetterAuthDataModel } from './rls';
import { authComponent } from './auth';
import { components } from './_generated/api';

export const createTeamMember = mutationWithRLS({
    args: {
        team: v.id('organization'),
        user: v.string(),
        role: v.union(v.literal('MANAGER'), v.literal('MEMBER')),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx).catch(() => null);
        if (!user || !user._id) throw new Error('User not authenticated');

        const now = Date.now();
        const organizationId = String(args.team);

        // Check if member already exists
        const existing = (await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "member",
              where: [{ field: "organizationId", value: organizationId }, { field: "userId", value: args.user }],
            }
        )) as BetterAuthDataModel["member"]["document"] | null;

        if (existing) {
            throw new Error('Member already exists in this organization');
        }

        // Map frontend roles to better-auth roles
        const betterAuthRole = args.role === 'MANAGER' ? 'admin' : 'member';

        const id = await ctx.runMutation(
            components.betterAuth.adapter.create,
            {
                input: {
                    data: {
                        organizationId: organizationId,
                        userId: args.user,
                        role: betterAuthRole,
                        createdAt: now,
                    },
                    model: "member",
                },
            }
        );
        return await ctx.db.get(id);
        return id;
    },
});

export const getTeamMembersByTeamId = queryWithRLS({
    args: { team: v.id('organization') },
    handler: async (ctx, args) => {
        const organizationId = String(args.team);

        const members = (await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "member",
              where: [{ field: "organizationId", value: organizationId }],
              paginationOpts: {
                cursor: null,
                numItems: 10,
              },
            }
        )) as BetterAuthDataModel["member"]["document"][];

        const withUser = await Promise.all(
            members.map(async m => {
                // Buscar el usuario por userId en la tabla user
                const user = (await ctx.runQuery(
                    components.betterAuth.adapter.findOne,
                    {
                        model: "user",
                        where: [{ field: "userId", value: m.userId }],
                    }
                )) as BetterAuthDataModel["user"]["document"] | null;
                return {
                    ...m,
                    role: m.role == 'owner' || m.role == 'admin' ? 'MANAGER' : 'MEMBER',
                } as typeof m & { role: 'MANAGER' | 'MEMBER' };
            })
        );
        return withUser;
    },
});

export const updateTeamMember = mutationWithRLS({
    args: {
        id: v.id('member'),
        role: v.union(v.literal('MANAGER'), v.literal('MEMBER')),
    },
    handler: async (ctx, args) => {
        const { id, role } = args;
        // Map frontend roles to better-auth roles
        const betterAuthRole = role === 'MANAGER' ? 'admin' : 'member';
        await ctx.runMutation(
            components.betterAuth.adapter.updateOne,
            {
                input: {
                    model: "member",
                    update: { role: betterAuthRole },
                    where: [{ field: "_id", value: id }],
                },
            }
        );
        return await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
                model: "member",
                where: [{ field: "_id", value: id }],
            }
        ) as BetterAuthDataModel["member"]["document"];
    },
});

export const deleteTeamMember = mutationWithRLS({
    args: { _id: v.id('member') },
    handler: async (ctx, args) => {
        await ctx.runMutation(
            components.betterAuth.adapter.deleteOne,
            {
                input: {
                    model: "member",
                    where: [{ field: "_id", value: args._id }],
                },
            }
        );
        return 'Team member deleted successfully' as const;
    },
});
