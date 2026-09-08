import { v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internalMutationWithRLS, mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { withInvalidCursorRetry } from './utils/pagination';
import {
    categoryInputValidator,
    categoryPatchValidator,
    createCategoryForCurrentOrganization,
    createDefaultCategoriesForCurrentOrganization,
    deleteCategoryForCurrentOrganization,
    listCategoriesForCurrentUser,
    updateCategoryForCurrentOrganization,
} from './domain/categories';
import { categoryDocumentValidator } from './utils/documentValidators';

export const getCategoriesByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    returns: paginationResultValidator(
        v.object({
            ...categoryDocumentValidator.fields,
            capabilities: v.object({ canEdit: v.boolean(), canDelete: v.boolean() }),
        })
    ),
    handler: async (ctx, args) => {
        return await withInvalidCursorRetry(args.paginationOpts, paginationOpts =>
            listCategoriesForCurrentUser(ctx, { ...args, paginationOpts })
        );
    },
});

export const createCategory = mutationWithRLS({
    args: categoryInputValidator,
    returns: v.id('categories'),
    handler: async (ctx, args) => {
        return await createCategoryForCurrentOrganization(ctx, args);
    },
});

export const updateCategory = mutationWithRLS({
    args: categoryPatchValidator,
    returns: v.nullable(v.id('categories')),
    handler: async (ctx, args) => {
        await updateCategoryForCurrentOrganization(ctx, args);
    },
});

export const deleteCategory = mutationWithRLS({
    args: {
        id: v.id('categories'),
    },
    returns: v.nullable(v.id('categories')),
    handler: async (ctx, args) => {
        await deleteCategoryForCurrentOrganization(ctx, args);
    },
});

export const createDefaultCategories = internalMutationWithRLS({
    args: {},
    returns: v.array(v.union(categoryDocumentValidator, v.null())),
    handler: async ctx => {
        return await createDefaultCategoriesForCurrentOrganization(ctx);
    },
});
