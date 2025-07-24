import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getUser = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) {
            throw new ConvexError("Unauthorized");
        }

        return await ctx.db.get(userId);
    },
});