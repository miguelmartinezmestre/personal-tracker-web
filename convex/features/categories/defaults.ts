import { DEFAULT_CATEGORIES } from './constants';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

export /** Gives an organization the default categories unless it already has some. */
async function insertDefaultCategories(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    userId?: Id<'user'>
): Promise<void> {
    const existing = await ctx.db
        .query('categories')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .first();

    if (existing) {
        return;
    }

    const now = Date.now();

    for (const category of DEFAULT_CATEGORIES) {
        await ctx.db.insert('categories', {
            userId,
            organizationId,
            name: category.name,
            color: category.color,
            icon: category.icon,
            createdAt: now,
            updatedAt: now,
        });
    }
}
