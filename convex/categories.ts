import { ConvexError, v } from 'convex/values';
import { ERROR_CODES } from './shared/errorCodes';
import { insertDefaultCategories } from './features/categories/defaults';
import { internalMutation } from './_generated/server';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { queryWithRLS } from './features/authorization/wrappers';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';

export const listCategories = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(
        v.object({
            id: v.id('categories'),
            name: v.string(),
            color: v.string(),
            icon: v.optional(v.string()),
        })
    ),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        const result = await ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .paginate(withPaginationLimits(args.paginationOpts));

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'categories',
                index: 'by_organization',
                prefix: [organizationId],
                indexKey: doc => [doc.organizationId],
                paginationOpts: args.paginationOpts,
                order: 'asc',
            },
            result,
            result.page.map(category => ({
                id: category._id,
                name: category.name,
                color: category.color,
                icon: category.icon,
            }))
        );
    },
});

export const seedDefaultCategories = internalMutation({
    args: { organizationId: v.string() },
    returns: v.null(),
    handler: async (ctx, args) => {
        const organizationId = ctx.db.normalizeId('organization', args.organizationId);

        if (!organizationId || !(await ctx.db.get('organization', organizationId))) {
            return null;
        }

        await insertDefaultCategories(ctx, organizationId);

        return null;
    },
});
