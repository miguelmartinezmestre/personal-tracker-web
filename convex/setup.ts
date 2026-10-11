import { ConvexError, v } from 'convex/values';
import type { ObjectType } from 'convex/values';
import { getAuthUserIdentity } from 'kitcn/auth';
import { internalQuery, mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { ERROR_CODES } from './constants';
import { queryWithRLS } from './rls/wrappers';
import { GLOBAL_ADMIN_ROLE, isGlobalAdminRole } from './utils';
import type { Id } from './_generated/dataModel';
import { isPersonalOrganizationForUser } from './personalOrganization';
import { buildOrganizationSlug } from './utils';
import { CATEGORY_COLOR_PATTERN, CATEGORY_ICONS, CATEGORY_NAME_MAX_LENGTH } from './constants';

const SETUP_LIMITS = {
    NAME_MAX: 100,
    CATEGORY_NAME_MAX: CATEGORY_NAME_MAX_LENGTH,
    CATEGORIES_MAX: 100,
} as const;

const SETUP_MEMBERSHIP_LIMIT = 100;
const CATEGORY_ICON_SET = new Set<string>(CATEGORY_ICONS);
const completeSetupArgsValidator = {
    platformName: v.string(),
    defaultLanguage: v.union(v.literal('en'), v.literal('es')),
    registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
    organizationName: v.string(),
    organizationLogo: v.optional(v.string()),
    categories: v.array(
        v.object({
            name: v.string(),
            color: v.string(),
            icon: v.optional(v.string()),
        })
    ),
} as const;
type CompleteSetupArgs = ObjectType<typeof completeSetupArgsValidator>;

function validateSetupArgs(args: CompleteSetupArgs) {
    if (args.platformName.trim().length === 0 || args.platformName.length > SETUP_LIMITS.NAME_MAX) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    if (
        args.organizationName.trim().length === 0 ||
        args.organizationName.length > SETUP_LIMITS.NAME_MAX
    ) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    if (args.organizationLogo !== undefined) {
        try {
            new URL(args.organizationLogo);
        } catch {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
    }
    if (args.categories.length > SETUP_LIMITS.CATEGORIES_MAX) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
    for (const category of args.categories) {
        if (
            category.name.trim().length === 0 ||
            category.name.length > SETUP_LIMITS.CATEGORY_NAME_MAX ||
            !CATEGORY_COLOR_PATTERN.test(category.color) ||
            (category.icon !== undefined && !CATEGORY_ICON_SET.has(category.icon))
        ) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
    }
}

async function assertFirstSetupUser(ctx: MutationCtx, userId: Id<'user'>) {
    const currentUser = await ctx.db.get('user', userId);
    if (!currentUser) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }
    const firstUser = await ctx.db.query('user').order('asc').first();
    if (!firstUser || firstUser._id !== userId) {
        throw new ConvexError(ERROR_CODES.SETUP_USER_MISMATCH);
    }
}

export const isPlatformSetUp = query({
    args: {},
    returns: v.boolean(),
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();
        return settings !== null;
    },
});
export const getPublicPlatformSettings = query({
    args: {},
    returns: v.union(
        v.object({
            platformName: v.string(),
            defaultLanguage: v.union(v.literal('en'), v.literal('es')),
            registrationPolicy: v.union(v.literal('open'), v.literal('invitation-only')),
        }),
        v.null()
    ),
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();
        if (!settings) {
            return null;
        }
        return {
            platformName: settings.platformName,
            defaultLanguage: settings.defaultLanguage,
            registrationPolicy: settings.registrationPolicy,
        };
    },
});
export const completeSetup = mutation({
    args: completeSetupArgsValidator,
    returns: v.object({
        organizationId: v.id('organization'),
    }),
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        const userId = ctx.db.normalizeId('user', identity?.userId ?? '');
        if (!userId) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }
        const platformSettings = await ctx.db.query('platformSettings').first();
        if (platformSettings) {
            throw new ConvexError(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
        }
        validateSetupArgs(args);
        await assertFirstSetupUser(ctx, userId);

        await ctx.db.patch('user', userId, { role: GLOBAL_ADMIN_ROLE });

        const memberships = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .take(SETUP_MEMBERSHIP_LIMIT + 1);
        if (memberships.length > SETUP_MEMBERSHIP_LIMIT) {
            throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
        }

        let reusableOrganizationId: Id<'organization'> | null = null;
        const personalOrganizationIds = new Set<Id<'organization'>>();
        for (const membership of memberships) {
            const organization = await ctx.db.get('organization', membership.organizationId);
            if (!organization) {
                continue;
            }
            if (isPersonalOrganizationForUser({ metadata: organization.metadata, userId })) {
                personalOrganizationIds.add(organization._id);
            } else if (!reusableOrganizationId) {
                reusableOrganizationId = organization._id;
            }
        }

        let organizationId: Id<'organization'>;
        if (reusableOrganizationId) {
            organizationId = reusableOrganizationId;
            await ctx.db.patch('organization', organizationId, {
                name: args.organizationName,
                ...(args.organizationLogo ? { logo: args.organizationLogo } : {}),
            });
        } else {
            const now = Date.now();
            organizationId = await ctx.db.insert('organization', {
                name: args.organizationName,
                slug: buildOrganizationSlug(args.organizationName),
                createdAt: now,
                metadata: null,
                logo: args.organizationLogo ?? null,
            });
            await ctx.db.insert('member', {
                organizationId,
                userId,
                role: 'owner',
                createdAt: now,
            });
        }

        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', userId))
            .take(SETUP_MEMBERSHIP_LIMIT + 1);
        if (sessions.length > SETUP_MEMBERSHIP_LIMIT) {
            throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
        }
        for (const session of sessions) {
            let currentOrganizationId = null;
            if (session.activeOrganizationId) {
                currentOrganizationId = ctx.db.normalizeId(
                    'organization',
                    session.activeOrganizationId
                );
            } else {
                currentOrganizationId = null;
            }
            if (!currentOrganizationId || personalOrganizationIds.has(currentOrganizationId)) {
                await ctx.db.patch('session', session._id, {
                    activeOrganizationId: organizationId,
                });
            }
        }

        const now = Date.now();
        for (const category of args.categories) {
            // A reused organization may already have the default categories.
            const sameName = await ctx.db
                .query('categories')
                .withIndex('by_organization_name', q =>
                    q.eq('organizationId', organizationId).eq('name', category.name)
                )
                .first();
            if (sameName) {
                continue;
            }
            await ctx.db.insert('categories', {
                userId,
                organizationId,
                name: category.name,
                color: category.color,
                icon: category.icon,
                createdAt: now,
                updatedAt: now,
            });
        }

        await ctx.db.insert('platformSettings', {
            platformName: args.platformName,
            defaultLanguage: args.defaultLanguage,
            registrationPolicy: args.registrationPolicy,
            setupCompletedBy: userId,
        });

        return { organizationId };
    },
});

export const normalizeUserId = internalQuery({
    args: { userId: v.string() },
    returns: v.union(v.id('user'), v.null()),
    handler: (ctx, args) => {
        return ctx.db.normalizeId('user', args.userId);
    },
});

export const isPlatformSetupUserInternal = internalQuery({
    args: { userId: v.id('user') },
    returns: v.boolean(),
    handler: async (ctx, args) => {
        const settings = await ctx.db.query('platformSettings').first();
        return settings?.setupCompletedBy === args.userId;
    },
});
export const isCurrentUserPlatformSetupUser = query({
    args: {},
    returns: v.boolean(),
    handler: async ctx => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            return false;
        }
        const userId = ctx.db.normalizeId('user', identity.userId);
        if (!userId) {
            return false;
        }
        const settings = await ctx.db.query('platformSettings').first();
        return settings?.setupCompletedBy === userId;
    },
});
export const getPlatformSetupUserId = queryWithRLS({
    args: {},
    returns: v.union(v.id('user'), v.null()),
    handler: async ctx => {
        if (!isGlobalAdminRole(ctx.role)) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        const settings = await ctx.db.query('platformSettings').first();
        return settings?.setupCompletedBy ?? null;
    },
});
