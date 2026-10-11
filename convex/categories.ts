import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { queryWithRLS } from './rls/wrappers';
import { DEFAULT_CATEGORIES, ERROR_CODES } from './constants';
import { internalMutation } from './utils';

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

/**
 * One-off backfill for organizations created before categories were seeded on creation. Run it
 * page by page (`npx convex run categories:backfillDefaultCategories '{"paginationOpts":
 * {"numItems": 50, "cursor": null}}'`) until `isDone` is true.
 */
export const backfillDefaultCategories = internalMutation({
    args: { paginationOpts: paginationOptsValidator },
    returns: v.object({
        isDone: v.boolean(),
        continueCursor: v.string(),
        seeded: v.number(),
    }),
    handler: async (ctx, args) => {
        const page = await ctx.db.query('organization').paginate(args.paginationOpts);
        let seeded = 0;
        for (const organization of page.page) {
            const hadCategories = await ctx.db
                .query('categories')
                .withIndex('by_organization', q => q.eq('organizationId', organization._id))
                .first();
            if (!hadCategories) {
                await insertDefaultCategories(ctx, organization._id);
                seeded++;
            }
        }
        return { isDone: page.isDone, continueCursor: page.continueCursor, seeded };
    },
});
