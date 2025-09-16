import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { betterAuthComponent } from "./auth";

export const createUpdateProgress = mutation({
  args: {
    objective: v.id("objectives"),
    updatedValue: v.number(),
    updateDate: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await betterAuthComponent.getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const now = Date.now();
    const id = await ctx.db.insert("progressUpdates", {
      objective: args.objective,
      updatedValue: args.updatedValue,
      updateDate: args.updateDate,
      comment: args.comment,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const getUpdateProgressByObjectiveId = query({
  args: { objective: v.id("objectives") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progressUpdates")
      .withIndex("by_objective", (q) => q.eq("objective", args.objective))
      .collect();
  },
});

export const updateUpdateProgress = mutation({
  args: {
    id: v.id("progressUpdates"),
    updatedValue: v.number(),
    updateDate: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteUpdateProgress = mutation({
  args: { id: v.id("progressUpdates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return "Update progress deleted successfully" as const;
  },
});