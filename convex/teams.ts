import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTeam = mutation({
    args: {
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const id = await ctx.db.insert("teams", {
            name: args.name,
            description: args.description,
            createdAt: now,
            updatedAt: now,
        });
        return await ctx.db.get(id);
    },
});

export const getTeams = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("teams").collect();
    },
});

export const getTeamById = query({
    args: { id: v.id("teams") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const updateTeam = mutation({
    args: {
        id: v.id("teams"),
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
        return await ctx.db.get(id);
    },
});

export const deleteTeam = mutation({
    args: { id: v.id("teams") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return "Team deleted successfully" as const;
    },
});


