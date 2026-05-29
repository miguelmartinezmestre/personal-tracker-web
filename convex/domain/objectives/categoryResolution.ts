import type { MutationCtx, QueryCtx } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';
import { ConvexError } from 'convex/values';
import { ERROR_CODES } from '../../utils/constants';

export async function getCategoryForObjective(
    ctx: QueryCtx | MutationCtx,
    organizationId: Id<'organization'>,
    categoryId: Id<'categories'>
): Promise<Doc<'categories'>> {
    const category = await ctx.db.get('categories', categoryId);
    if (!category) {
        throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
    }
    if (category.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    return category;
}
