import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { betterAuthComponent } from "./auth";
import { Id } from "./_generated/dataModel";

export const getObjectivesByUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await betterAuthComponent.getAuthUserId(ctx) as Id<"users">;
        if (!userId) throw new Error("User not authenticated");
        return await ctx.db
            .query("objectives")
            .withIndex("by_user", (q) => q.eq("user", userId))
            .collect();
    },
});

export const getObjectiveById = query({
    args: {
        id: v.id("objectives"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const createObjective = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.number(),
        currentValue: v.number(),
        deadline: v.optional(v.number()),
        status: v.string(),
        unit: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await betterAuthComponent.getAuthUserId(ctx) as Id<"users">;
        console.log(userId);
        if (!userId) {
            throw new Error("User not authenticated");
        }
        const now = Date.now();
        return await ctx.db.insert("objectives", {
            user: userId,
            title: args.title,
            description: args.description,
            category: args.category,
            targetValue: args.targetValue,
            currentValue: args.currentValue,
            deadline: args.deadline,
            status: args.status,
            unit: args.unit,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateObjective = mutation({
    args: {
        id: v.id("objectives"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        targetValue: v.optional(v.number()),
        currentValue: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: v.optional(v.string()),
        unit: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        return await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    },
});

export const deleteObjective = mutation({
    args: {
        id: v.id("objectives"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.delete(args.id);
    },
});
