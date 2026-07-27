import { ConvexError, ObjectType, v } from 'convex/values';
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
};

type CategoryMutationCtx = {
    db: DatabaseWriter;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
};

type CategoryInput = ObjectType<typeof categoryInputValidator>;

type CategoryPatch = ObjectType<typeof categoryPatchValidator>;

const DEFAULT_CATEGORIES: CategoryInput[] = [
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

function requireActiveOrganization(ctx: CategoryQueryCtx): Id<'organization'> {
    if (!ctx.organizationId) {
        throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
    }

    return ctx.organizationId;
}

function normalizeCategoryName(name: string) {
    return normalizeRequiredBoundedString(name, CATEGORY_NAME_MAX_LENGTH);
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

    return await ctx.db
        .query('categories')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .order('desc')
        .paginate(args.paginationOpts);
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

    return await ctx.db.patch('categories', categoryId, patch);
}

export async function deleteCategoryForCurrentOrganization(
    ctx: CategoryMutationCtx,
    args: { id: Id<'categories'> }
) {
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

    return await ctx.db.delete('categories', args.id);
}

export async function createDefaultCategoriesForCurrentOrganization(ctx: CategoryMutationCtx) {
    const organizationId = requireActiveOrganization(ctx);
    const now = Date.now();
    const results = [];

    for (const category of DEFAULT_CATEGORIES) {
        const exists = await findCategoryByOrganizationAndName(ctx, organizationId, category.name);

        if (!exists) {
            const categoryId = await ctx.db.insert('categories', {
                userId: ctx.userId,
                organizationId,
                name: category.name,
                color: category.color,
                icon: category.icon,
                createdAt: now,
                updatedAt: now,
            });
            results.push(await ctx.db.get('categories', categoryId));
        }
    }

    return results;
}
