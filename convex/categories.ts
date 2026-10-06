import { ConvexError, v } from 'convex/values';
import { queryWithRLS } from './rls/wrappers';
import { ERROR_CODES } from './constants';

export const listCategories = queryWithRLS({
    args: {},
    returns: v.array(
        v.object({
            id: v.id('categories'),
            name: v.string(),
            color: v.string(),
            icon: v.optional(v.string()),
        })
    ),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }
        const categories = await ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .take(100);
        return categories.map(category => ({
            id: category._id,
            name: category.name,
            color: category.color,
            ...(category.icon !== undefined ? { icon: category.icon } : {}),
        }));
    },
});
