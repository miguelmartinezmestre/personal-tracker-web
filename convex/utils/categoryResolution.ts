import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { ConvexError } from 'convex/values';
import { ERROR_CODES } from './constants';


export async function getCategoryForObjective(
    ctx: QueryCtx | MutationCtx,
    organizationId: Id<'organization'>,
    userId: Id<'user'>,
    categoryId: Id<'categories'>
): Promise<Doc<'categories'>> {
    const cat = await ctx.db.get('categories', categoryId);
    if (!cat) {
        throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
    }
    if (cat.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    if (cat.userId !== userId) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    return cat;
}


export async function findCategoryIdByName(
    ctx: QueryCtx | MutationCtx,
    organizationId: Id<'organization'>,
    name: string
): Promise<Id<'categories'> | undefined> {
    const trimmed = name.trim();
    if (!trimmed) return undefined;

    const match = await ctx.db
        .query('categories')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .filter(q => q.eq(q.field('name'), trimmed))
        .first();

    return match?._id;
}
