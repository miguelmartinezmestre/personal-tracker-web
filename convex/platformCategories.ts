import { ConvexError, v } from 'convex/values';
import { ERROR_CODES } from './shared/errorCodes';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { isGlobalAdminRole } from './features/auth/roles';
import { MAX_CHOSEN_CATEGORIES } from './features/categories/constants';
import { normalizeCategory } from './features/categories/rules';
import { categoryInputValidator } from './features/categories/validators';

// Every user reads it to choose their organization's categories; only the global admin edits it.
export const listPlatformCategories = queryWithRLS({
    args: {},
    returns: v.array(
        v.object({
            id: v.id('platformCategories'),
            name: v.string(),
            color: v.string(),
            icon: v.optional(v.string()),
        })
    ),
    handler: async ctx => {
        const categories = await ctx.db
            .query('platformCategories')
            .withIndex('by_name')
            .take(MAX_CHOSEN_CATEGORIES);

        return categories.map(category => ({
            id: category._id,
            name: category.name,
            color: category.color,
            icon: category.icon,
        }));
    },
});

export const createPlatformCategory = mutationWithRLS({
    args: { category: categoryInputValidator },
    returns: v.id('platformCategories'),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const category = normalizeCategory(args.category);

        const existing = await ctx.db
            .query('platformCategories')
            .withIndex('by_name')
            .take(MAX_CHOSEN_CATEGORIES);

        if (existing.length >= MAX_CHOSEN_CATEGORIES) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        if (existing.some(other => other.name === category.name)) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NAME_TAKEN);
        }

        const now = Date.now();

        return await ctx.db.insert('platformCategories', {
            ...category,
            createdAt: now,
            updatedAt: now,
        });
    },
});

// Organizations keep their copies untouched (INH-ADM-07).
export const updatePlatformCategory = mutationWithRLS({
    args: { id: v.id('platformCategories'), category: categoryInputValidator },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const category = normalizeCategory(args.category);

        const sameName = await ctx.db
            .query('platformCategories')
            .withIndex('by_name', q => q.eq('name', category.name))
            .take(2);

        if (sameName.some(other => other._id !== args.id)) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NAME_TAKEN);
        }

        if (!(await ctx.db.get('platformCategories', args.id))) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        await ctx.db.patch('platformCategories', args.id, { ...category, updatedAt: Date.now() });

        return null;
    },
});

export const deletePlatformCategory = mutationWithRLS({
    args: { id: v.id('platformCategories') },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        if (!(await ctx.db.get('platformCategories', args.id))) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        await ctx.db.delete('platformCategories', args.id);

        return null;
    },
});
