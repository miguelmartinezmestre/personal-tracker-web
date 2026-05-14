import { ConvexError } from 'convex/values';
import { MutationCtx, QueryCtx } from '../_generated/server';
import { getAuthUserIdentity } from 'kitcn/auth';
import { ERROR_CODES } from './constants';

type AdminContext = MutationCtx | QueryCtx;

export async function requireAdmin(ctx: AdminContext) {
    const identity = await getAuthUserIdentity(ctx);
    const userId = identity?.userId;

    if (!userId) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const user = await ctx.db.get('user', userId);

    if (!user || user.role !== 'admin') {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
}
