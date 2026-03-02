import { ConvexError } from 'convex/values';
import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { getAuthUserId } from 'better-convex/auth';

export async function requireAdmin(ctx: GenericMutationCtx<DataModel>) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new ConvexError('Unauthenticated 6');
  }

  const user = await ctx.db.get('user', String(userId) as Id<'user'>);

  if (!user || user.role !== 'admin') {
    throw new ConvexError('Unauthenticated 7');
  }
}
