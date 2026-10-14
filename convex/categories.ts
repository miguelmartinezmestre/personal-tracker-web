import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { queryWithRLS } from './rls/wrappers';
import { withNextPageCheck } from './pagination';
import { withPaginationLimits } from './utils';
import { DEFAULT_CATEGORIES, ERROR_CODES } from './constants';

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
                ...(category.icon !== undefined ? { icon: category.icon } : {}),
            }))
        );
    },
});

/** Gives an organization the default categories unless it already has some. */
export async function insertDefaultCategories(
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
            ...(userId ? { userId } : {}),
            organizationId,
            name: category.name,
            color: category.color,
            icon: category.icon,
            createdAt: now,
            updatedAt: now,
        });
    }
}

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
