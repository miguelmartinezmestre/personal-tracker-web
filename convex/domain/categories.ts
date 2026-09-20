import { categoryCapabilities } from './categoriesPermissions';
import type { ObjectType } from 'convex/values';
import { ConvexError, v } from 'convex/values';
import type { PaginationOptions } from 'convex/server';
import type { Id } from '../_generated/dataModel';
import type { DatabaseReader, DatabaseWriter } from '../_generated/server';
import { ERROR_CODES } from '../utils/constants';
import { CATEGORY_NAME_MAX_LENGTH } from '../../shared/input-constraints';
import {
    assertValidCategoryColor,
    assertValidCategoryIcon,
    normalizeRequiredBoundedString,
} from '../utils/inputValidation';

export const categoryInputValidator = {
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
} as const;

export const categoryPatchValidator = {
    id: v.id('categories'),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.union(v.string(), v.null())),
} as const;

type CategoryQueryCtx = {
    db: DatabaseReader;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role?: string;
    memberRole?: string | null;
};

type CategoryMutationCtx = {
    db: DatabaseWriter;
    dbForIntegrityChecks: DatabaseReader;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role?: string;
    memberRole?: string | null;
};

type CategoryInput = ObjectType<typeof categoryInputValidator>;

type CategoryPatch = ObjectType<typeof categoryPatchValidator>;

function requireActiveOrganization(ctx: CategoryQueryCtx): Id<'organization'> {
    if (!ctx.organizationId) {
        throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
    }

    return ctx.organizationId;
}

function normalizeCategoryName(name: string) {
    return normalizeRequiredBoundedString(name, CATEGORY_NAME_MAX_LENGTH);
}

function preserveForbiddenError(error: unknown): never {
    if (String(error).toLowerCase().includes('write access not allowed')) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    throw error;
}

async function findCategoryByOrganizationAndName(
    ctx: CategoryQueryCtx,
    organizationId: Id<'organization'>,
    name: string
) {
    return await ctx.db
        .query('categories')
        .withIndex('by_organization_name', q =>
            q.eq('organizationId', organizationId).eq('name', name)
        )
        .first();
}

export async function listCategoriesForCurrentUser(
    ctx: CategoryQueryCtx,
    args: { paginationOpts: PaginationOptions }
) {
    const organizationId = requireActiveOrganization(ctx);

    const result = await ctx.db
        .query('categories')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .order('desc')
        .paginate(args.paginationOpts);
    return {
        ...result,
        page: result.page.map(category => ({
            ...category,
            capabilities: categoryCapabilities(ctx, category),
        })),
    };
}

export async function createCategoryForCurrentOrganization(
    ctx: CategoryMutationCtx,
    args: CategoryInput
) {
    const now = Date.now();
    const organizationId = requireActiveOrganization(ctx);
    const trimmedName = normalizeCategoryName(args.name);
    assertValidCategoryColor(args.color);
    assertValidCategoryIcon(args.icon);

    const existingCategory = await findCategoryByOrganizationAndName(
        ctx,
        organizationId,
        trimmedName
    );

    if (existingCategory) {
        throw new ConvexError(ERROR_CODES.DUPLICATE_CATEGORY_NAME);
    }

    return await ctx.db.insert('categories', {
        userId: ctx.userId,
        organizationId,
        name: trimmedName,
        color: args.color,
        icon: args.icon,
        createdAt: now,
        updatedAt: now,
    });
}

export async function updateCategoryForCurrentOrganization(
    ctx: CategoryMutationCtx,
    args: CategoryPatch
) {
    const { id: categoryId } = args;
    const existing = await ctx.db.get('categories', categoryId);
    if (!existing) {
        throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
    }

    const patch: {
        name?: string;
        color?: string;
        icon?: string | undefined;
        updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.name !== undefined) {
        const trimmedName = normalizeCategoryName(args.name);

        const matchingCategories = await ctx.db
            .query('categories')
            .withIndex('by_organization_name', q =>
                q.eq('organizationId', existing.organizationId).eq('name', trimmedName)
            )
            .take(2);

        if (matchingCategories.some(category => category._id !== categoryId)) {
            throw new ConvexError(ERROR_CODES.DUPLICATE_CATEGORY_NAME);
        }

        patch.name = trimmedName;
    }

    if (args.color !== undefined) {
        assertValidCategoryColor(args.color);
        patch.color = args.color;
    }
    if (args.icon !== undefined) {
        assertValidCategoryIcon(args.icon);
        patch.icon = args.icon ?? undefined;
    }

    try {
        await ctx.db.patch('categories', categoryId, patch);
    } catch (error) {
        preserveForbiddenError(error);
    }
}

export async function deleteCategoryForCurrentOrganization(
    ctx: CategoryMutationCtx,
    args: { id: Id<'categories'> }
) {
    const category = await ctx.db.get('categories', args.id);
    if (!category) {
        throw new ConvexError(ERROR_CODES.CATEGORY_NOT_FOUND);
    }

    // The integrity reader intentionally bypasses RLS. Check the capability before
    // using it so a failed delete cannot reveal references from another owner.
    if (!categoryCapabilities(ctx, category).canDelete) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }

    const hasObjectives = await ctx.dbForIntegrityChecks
        .query('objectives')
        .withIndex('by_categoryId', q => q.eq('categoryId', args.id))
        .first();

    if (hasObjectives) {
        throw new ConvexError(ERROR_CODES.CATEGORY_HAS_OBJECTIVES);
    }

    try {
        await ctx.db.delete('categories', args.id);
    } catch (error) {
        preserveForbiddenError(error);
    }
}
