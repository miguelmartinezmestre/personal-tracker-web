import { ConvexError } from 'convex/values';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { getAuthUserId } from 'better-convex/auth';
import { ERROR_CODES } from './constants';

type AdminContext = GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>;

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
