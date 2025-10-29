import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTeamMember = mutation({
    args: {
        team: v.id("teams"),
        user: v.id("users"),
        role: v.union(v.literal("MANAGER"), v.literal("MEMBER")),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const id = await ctx.db.insert("teamMembers", {
            team: args.team,
            user: args.user,
            role: args.role,
            createdAt: now,
            updatedAt: now,
        });
        return await ctx.db.get(id);
    },
});

export const getTeamMembersByTeamId = query({
    args: { team: v.id("teams") },
    handler: async (ctx, args) => {
        const members = await ctx.db
            .query("teamMembers")
            .withIndex("by_team", (q) => q.eq("team", args.team))
            .collect();
        const withUser = await Promise.all(
            members.map(async (m) => {
                const user = await ctx.db.get(m.user);
                return { ...m, email: (user as any)?.email ?? "" } as any;
            })
        );
        return withUser;
    },
});

export const updateTeamMember = mutation({
    args: {
        id: v.id("teamMembers"),
        role: v.union(v.literal("MANAGER"), v.literal("MEMBER")),
    },
    handler: async (ctx, args) => {
        const { id, role } = args;
        await ctx.db.patch(id, { role, updatedAt: Date.now() });
        return await ctx.db.get(id);
    },
});

export const deleteTeamMember = mutation({
    args: { _id: v.id("teamMembers") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args._id);
        return "Team member deleted successfully" as const;
    },
});


