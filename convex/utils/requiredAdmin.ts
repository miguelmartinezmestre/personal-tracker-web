import { ConvexError } from 'convex/values';
import { MutationCtx, QueryCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { getAuthUserId } from 'better-convex/auth';
import { ERROR_CODES } from './constants';

type AdminContext = MutationCtx | QueryCtx;

export async function requireAdmin(ctx: AdminContext) {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const user = await ctx.db.get('user', userId as Id<'user'>);

    if (!user || user.role !== 'admin') {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
}
