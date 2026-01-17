import { ConvexError } from "convex/values";
import { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

export async function requireAdmin(ctx: QueryCtx | MutationCtx | ActionCtx) {
    const currentUser = await authComponent.getAuthUser(ctx);
    if (currentUser?.role !== 'admin') {
        throw new ConvexError('Admin access required');
    }
}