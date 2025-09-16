import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { betterAuthComponent } from "./auth";
import { Id } from "./_generated/dataModel";

export const getSessionsByUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await betterAuthComponent.getAuthUserId(ctx) as Id<"users">;
        if (!userId) throw new Error("User not authenticated");
        return await ctx.db
            .query("sessions")
            .withIndex("by_user", (q) => q.eq("user", userId))
            .collect();
    },
});

export const invalidateSession = mutation({
    args: { id: v.id("sessions") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: "inactive", updatedAt: Date.now() });
        return { message: "Session invalidated" } as const;
    },
});


