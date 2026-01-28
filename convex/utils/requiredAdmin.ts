import { ConvexError } from "convex/values";
import { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

export async function requireAdmin(ctx: QueryCtx | MutationCtx | ActionCtx) {
    const currentUser = await ctx.auth.getUserIdentity().catch(() => null);
    if (currentUser?.role !== 'admin') {
        throw new ConvexError('Admin access required');
    }
}