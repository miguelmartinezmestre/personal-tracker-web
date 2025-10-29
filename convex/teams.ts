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
    args: { _id: v.id("teams") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args._id);
    },
});

export const updateTeam = mutation({
    args: {
        _id: v.id("teams"),
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const { _id, ...rest } = args;
        await ctx.db.patch(_id, { ...rest, updatedAt: Date.now() });
        return await ctx.db.get(_id);
    },
});

export const deleteTeam = mutation({
    args: { _id: v.id("teams") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args._id);
        return "Team deleted successfully" as const;
    },
});


