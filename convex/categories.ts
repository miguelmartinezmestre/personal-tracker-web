import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { queryWithRLS, mutationWithRLS } from './rls';
import {
    createCategoryForCurrentOrganization,
    createDefaultCategoriesForCurrentOrganization,
    deleteCategoryForCurrentOrganization,
    listCategoriesForCurrentUser,
    listCategoryNamesForFilters,
    updateCategoryForCurrentOrganization,
} from './domain/categories';

export const getCategoriesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await listCategoriesForCurrentUser(ctx, args);
    },
});

export const getCategoryNamesForFilters = queryWithRLS({
    args: {},
    handler: async ctx => {
        return await listCategoryNamesForFilters(ctx);
    },
});

export const createCategory = mutationWithRLS({
    args: {
        name: v.string(),
        color: v.string(),
        icon: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await createCategoryForCurrentOrganization(ctx, args);
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
        return await updateCategoryForCurrentOrganization(ctx, args);
    },
});

export const deleteCategory = mutationWithRLS({
    args: {
        id: v.id('categories'),
    },
    handler: async (ctx, args) => {
        return await deleteCategoryForCurrentOrganization(ctx, args);
    },
});

export const createDefaultCategories = mutationWithRLS({
    args: {},
    handler: async ctx => {
        return await createDefaultCategoriesForCurrentOrganization(ctx);
    },
});
