import { v } from "convex/values";
import { query } from "./_generated/server";


export const getObjectivesByUser = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("objectives").filter((q) => q.eq(q.field("user"), args.userId)).collect();
    },
});