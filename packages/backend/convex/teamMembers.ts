import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { getAuthenticatedUser } from './auth';

export const createTeamMember = mutationWithRLS({
    args: {
        team: v.id("organization"),
        user: v.string(),
        role: v.union(v.literal("MANAGER"), v.literal("MEMBER")),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);
        if (!user || !user._id) throw new Error("User not authenticated");
        
        const now = Date.now();
        const organizationId = String(args.team);
        
        // Check if member already exists
        const existing = await ctx.db
            .query("member")
            .withIndex("organizationId", (q) => q.eq("organizationId", organizationId))
            .filter((q) => q.eq(q.field("userId"), args.user))
            .first();
        
        if (existing) {
            throw new Error("Member already exists in this organization");
        }
        
        // Map frontend roles to better-auth roles
        const betterAuthRole = args.role === "MANAGER" ? "admin" : "member";
        
        const id = await ctx.db.insert("member", {
            organizationId: organizationId,
            userId: args.user,
            role: betterAuthRole,
            createdAt: now,
        });
        return await ctx.db.get(id);
    },
});

export const getTeamMembersByTeamId = queryWithRLS({
    args: { team: v.id('organization') },
    handler: async (ctx, args) => {
        const organizationId = String(args.team);
        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .collect();

        const withUser = await Promise.all(
            members.map(async m => {
                // Buscar el usuario por userId en la tabla user
                const user = await ctx.db
                    .query('user')
                    .withIndex('userId', q => q.eq('userId', m.userId))
                    .first();
                return {
                    ...m,
                    email: user?.email ?? '',
                    // Map better-auth roles to old role names for compatibility
                    role:
                        m.role === 'owner' ? 'MANAGER' : m.role === 'admin' ? 'MANAGER' : 'MEMBER',
                } as typeof m & { email: string; role: 'MANAGER' | 'MEMBER' };
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
        await ctx.db.patch(id, { role: betterAuthRole });
        return await ctx.db.get(id);
    },
});

export const deleteTeamMember = mutationWithRLS({
    args: { _id: v.id('member') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args._id);
        return 'Team member deleted successfully' as const;
    },
});
