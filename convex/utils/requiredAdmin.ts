import { ConvexError } from 'convex/values';
import { MutationCtx, QueryCtx } from '../_generated/server';
import { getAuthUserIdentity } from 'kitcn/auth';
import { ERROR_CODES } from './constants';
import { isGlobalAdminRole } from '../../shared/platform-roles';

type AdminContext = MutationCtx | QueryCtx;

export async function requireAdmin(ctx: AdminContext) {
    const identity = await getAuthUserIdentity(ctx);
    const userId = identity?.userId;

    if (!userId) {
        throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
    }

    const user = await ctx.db.get('user', userId);

    if (!user || !isGlobalAdminRole(user.role)) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
}
