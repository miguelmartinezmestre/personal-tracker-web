import { ConvexError } from "convex/values";
import { query } from "../_generated/server";

import { getAuthUserIdentity } from 'better-convex/auth';
import { GenericMutationCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";

export const getAuthUser = query({
  handler: async (ctx) => {
    const identity = await getAuthUserIdentity(ctx);
    if (!identity) throw new ConvexError("Unauthenticated");

    return await ctx.db.get('user', identity.userId);
  },
});

export async function requireAdmin(_: GenericMutationCtx<DataModel>) {
    // const currentUser = await getAuthUserIdentity(ctx);
    // TODO: Implement admin check
}