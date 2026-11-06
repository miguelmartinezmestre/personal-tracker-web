import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { ERROR_CODES } from './shared/errorCodes';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';
import { isOrganizationAdminRole } from './features/organizations/roles';
import { MAX_CHOSEN_CATEGORIES } from './features/categories/constants';
import { canManageCategory, normalizeCategory } from './features/categories/rules';
import { categoryInputValidator } from './features/categories/validators';
import { getMembershipRole } from './features/auth/authRecords';

export const listCategories = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(
        v.object({
            id: v.id('categories'),
            name: v.string(),
            color: v.string(),
            icon: v.optional(v.string()),
            canManage: v.boolean(),
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
                canManage: canManageCategory(ctx, category),
            }))
        );
    },
});

export const createCategory = mutationWithRLS({
    args: { category: categoryInputValidator },
    returns: v.id('categories'),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        const category = normalizeCategory(args.category);

        const sameName = await ctx.db
            .query('categories')
            .withIndex('by_organization_name', q =>
                q.eq('organizationId', organizationId).eq('name', category.name)
            )
            .first();

        if (sameName) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NAME_TAKEN);
        }

        const now = Date.now();

        return await ctx.db.insert('categories', {
            ...category,
            userId: ctx.userId,
            organizationId,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const updateCategory = mutationWithRLS({
    args: { id: v.id('categories'), category: categoryInputValidator },
    returns: v.null(),
    handler: async (ctx, args) => {
        const existing = await ctx.db.get('categories', args.id);

        if (!existing) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        if (!canManageCategory(ctx, existing)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const category = normalizeCategory(args.category);

        const sameName = await ctx.db
            .query('categories')
            .withIndex('by_organization_name', q =>
                q.eq('organizationId', existing.organizationId).eq('name', category.name)
            )
            .take(2);

        if (sameName.some(other => other._id !== existing._id)) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NAME_TAKEN);
        }

        await ctx.db.patch('categories', existing._id, { ...category, updatedAt: Date.now() });

        return null;
    },
});

export const deleteCategory = mutationWithRLS({
    args: { id: v.id('categories') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const category = await ctx.db.get('categories', args.id);

        if (!category) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        if (!canManageCategory(ctx, category)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        // Objectives the actor can't see still count, so this skips RLS once access is checked.
        const inUse = await ctx.dbForIntegrityChecks
            .query('objectives')
            .withIndex('by_category', q => q.eq('categoryId', category._id))
            .first();

        if (inUse) {
            throw new ConvexError(ERROR_CODES.CATEGORY_IN_USE);
        }

        await ctx.db.delete('categories', category._id);

        return null;
    },
});

export const addChosenCategories = mutationWithRLS({
    args: { organizationId: v.string(), categories: v.array(categoryInputValidator) },
    returns: v.null(),
    handler: async (ctx, args) => {
        const memberRole = await getMembershipRole(ctx, args.organizationId, ctx.userId);

        if (!isOrganizationAdminRole(memberRole)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        if (args.categories.length > MAX_CHOSEN_CATEGORIES) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const now = Date.now();

        for (const input of args.categories) {
            const category = normalizeCategory(input);

            const sameName = await ctx.dbForIntegrityChecks
                .query('categories')
                .withIndex('by_organization_name', q =>
                    q.eq('organizationId', args.organizationId).eq('name', category.name)
                )
                .first();

            if (!sameName) {
                await ctx.db.insert('categories', {
                    ...category,
                    userId: ctx.userId,
                    organizationId: args.organizationId,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        return null;
    },
});
