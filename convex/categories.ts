import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { queryWithRLS, mutationWithRLS } from './rls';
import { ERROR_CODES } from './utils/constants';

const LIST_LIMIT = 1000;

export const getCategoriesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('categories')
            .withIndex('by_user', q => q.eq('userId', ctx.userId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const getCategoryNamesForFilters = queryWithRLS({
    args: {},
    handler: async ctx => {
        const categories = await ctx.db
            .query('categories')
            .withIndex('by_user', q => q.eq('userId', ctx.userId))
            .take(LIST_LIMIT);

        return Array.from(
            new Set(
                categories
                    .map(category => category.name.trim())
                    .filter((name): name is string => name.length > 0)
            )
        ).sort((a, b) => a.localeCompare(b));
    },
});

export const createCategory = mutationWithRLS({
    args: {
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const userId = ctx.userId;
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        const trimmedName = args.name.trim();
        if (!trimmedName) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const existingCategory = await ctx.db
            .query('categories')
            .withIndex('by_organization_name', q =>
                q.eq('organizationId', organizationId).eq('name', trimmedName)
            )
            .first();

        if (existingCategory) {
            throw new ConvexError(ERROR_CODES.DUPLICATE_CATEGORY_NAME);
        }

        const categoryId = await ctx.db.insert('categories', {
            userId: userId,
            organizationId,
            name: trimmedName,
            color: args.color,
            icon: args.icon,
            createdAt: now,
            updatedAt: now,
        });

        return categoryId;
    },
});

export const updateCategory = mutationWithRLS({
    args: {
        id: v.id('categories'),
        name: v.optional(v.string()),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...rest } = args;
        const existing = await ctx.db.get('categories', id);
        if (!existing) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        if (rest.name !== undefined) {
            const trimmedName = rest.name.trim();
            if (!trimmedName) {
                throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
            }

            const duplicateCategory = await ctx.db
                .query('categories')
                .withIndex('by_organization_name', q =>
                    q.eq('organizationId', existing.organizationId).eq('name', trimmedName)
                )
                .filter(q => q.neq(q.field('_id'), id))
                .first();

            if (duplicateCategory) {
                throw new ConvexError(ERROR_CODES.DUPLICATE_CATEGORY_NAME);
            }

            rest.name = trimmedName;
        }

        const result = await ctx.db.patch('categories', id, { ...rest, updatedAt: Date.now() });

        return result;
    },
});

export const deleteCategory = mutationWithRLS({
    args: {
        id: v.id('categories'),
    },
    handler: async (ctx, args) => {
        const category = await ctx.db.get('categories', args.id);
        if (!category) {
            throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
        }

        if (category.organizationId !== ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const hasObjectives = await ctx.db
            .query('objectives')
            .withIndex('by_categoryId', q => q.eq('categoryId', args.id))
            .first();

        if (hasObjectives) {
            throw new ConvexError(ERROR_CODES.CATEGORY_HAS_OBJECTIVES);
        }

        const result = await ctx.db.delete('categories', args.id);

        return result;
    },
});

export const createDefaultCategories = mutationWithRLS({
    args: {},
    handler: async ctx => {
        const user = ctx.userId;
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }
        const now = Date.now();
        const defaultCategories = [
            { name: 'Health & Fitness', color: '#10b981', icon: 'heart' },
            { name: 'Career & Business', color: '#3b82f6', icon: 'briefcase' },
            { name: 'Learning & Education', color: '#8b5cf6', icon: 'book' },
            { name: 'Personal Development', color: '#f59e0b', icon: 'user' },
            { name: 'Finance & Savings', color: '#22c55e', icon: 'dollar-sign' },
            { name: 'Relationships', color: '#ec4899', icon: 'users' },
            { name: 'Creative Projects', color: '#a855f7', icon: 'palette' },
            { name: 'Home & Organization', color: '#06b6d4', icon: 'home' },
            { name: 'Travel & Adventure', color: '#f97316', icon: 'map' },
        ];

        const results = [];
        for (const category of defaultCategories) {
            const exists = await ctx.db
                .query('categories')
                .withIndex('by_organization_name', q =>
                    q.eq('organizationId', organizationId).eq('name', category.name)
                )
                .first();

            if (!exists) {
                const id = await ctx.db.insert('categories', {
                    userId: user,
                    organizationId,
                    name: category.name,
                    color: category.color,
                    icon: category.icon,
                    createdAt: now,
                    updatedAt: now,
                });
                results.push(await ctx.db.get('categories', id));
            }
        }

        return results;
    },
});
