import { ConvexError } from 'convex/values';
import type { ObjectType } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { seedAchievementDefinitionsJob } from '../../jobs/achievements/checks';
import {
    completeSetupArgsValidator,
    ensureTestOrganizationInternalArgsValidator,
} from './validators';
import { GLOBAL_ADMIN_ROLE, isGlobalAdminRole } from '../../../shared/platform-roles';

type CompleteSetupArgs = ObjectType<typeof completeSetupArgsValidator>;

type EnsureTestOrganizationArgs = ObjectType<typeof ensureTestOrganizationInternalArgsValidator>;

const SETUP_LIMITS = {
    NAME_MAX: 100,
    CATEGORY_NAME_MAX: 50,
    CATEGORIES_MAX: 100,
} as const;

const CATEGORY_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

const CATEGORY_ICONS = new Set([
    'tag',
    'heart',
    'briefcase',
    'book',
    'user',
    'dollar-sign',
    'users',
    'palette',
    'home',
    'map',
    'target',
    'chart',
    'check',
    'calendar',
    'lightbulb',
    'trending-up',
    'star',
    'award',
    'zap',
    'coffee',
    'music',
    'camera',
    'plane',
]);

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

function assertNonEmptyBoundedString(value: string, maxLength: number) {
    if (value.trim().length === 0 || value.length > maxLength) {
        throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
    }
}

function assertSetupArgs(args: CompleteSetupArgs) {
    assertNonEmptyBoundedString(args.platformName, SETUP_LIMITS.NAME_MAX);
    assertNonEmptyBoundedString(args.organizationName, SETUP_LIMITS.NAME_MAX);

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
        assertNonEmptyBoundedString(category.name, SETUP_LIMITS.CATEGORY_NAME_MAX);
        if (!CATEGORY_COLOR_RE.test(category.color)) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
        if (category.icon !== undefined && !CATEGORY_ICONS.has(category.icon)) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }
    }
}

export async function isPlatformConfigured(ctx: { db: DatabaseReader }) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings !== null;
}

export async function getPublicSettings(ctx: { db: DatabaseReader }) {
    const settings = await ctx.db.query('platformSettings').first();
    if (!settings) return null;
    return {
        platformName: settings.platformName,
        defaultLanguage: settings.defaultLanguage,
        registrationPolicy: settings.registrationPolicy,
    };
}

export async function isPlatformSetupUser(ctx: { db: DatabaseReader }, userId: Id<'user'>) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings?.setupCompletedBy === userId;
}

export async function getPlatformSetupUserId(ctx: { db: DatabaseReader }) {
    const settings = await ctx.db.query('platformSettings').first();
    return settings?.setupCompletedBy ?? null;
}

export async function completePlatformSetup(
    ctx: MutationCtx,
    userId: Id<'user'>,
    args: CompleteSetupArgs
): Promise<{ success: true; organizationId: Id<'organization'> }> {
    assertSetupArgs(args);

    const existingSettings = await ctx.db.query('platformSettings').first();
    if (existingSettings) {
        throw new ConvexError(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
    }

    const currentUser = await ctx.db.get(userId);

    if (!currentUser) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    // The platform admin is the first registered account. Requiring exactly one
    // user here would permanently brick setup if a second account registered
    // before setup completed; instead we bind setup to the earliest user, which
    // also prevents a later registrant from hijacking the admin role.
    const firstUser = await ctx.db.query('user').order('asc').first();

    if (!firstUser || firstUser._id !== userId) {
        throw new ConvexError(ERROR_CODES.SETUP_USER_MISMATCH);
    }

    await ctx.db.patch(userId, { role: GLOBAL_ADMIN_ROLE });

    const membership = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .first();

    let organizationId: Id<'organization'>;

    if (membership) {
        organizationId = membership.organizationId;
        await ctx.db.patch(organizationId, {
            name: args.organizationName,
            ...(args.organizationLogo ? { logo: args.organizationLogo } : {}),
        });
    } else {
        const now = Date.now();
        organizationId = await ctx.db.insert('organization', {
            name: args.organizationName,
            slug: slugify(args.organizationName),
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

    const now = Date.now();
    for (const category of args.categories) {
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

    await seedAchievementDefinitionsJob(ctx);

    await ctx.db.insert('platformSettings', {
        platformName: args.platformName,
        defaultLanguage: args.defaultLanguage,
        registrationPolicy: args.registrationPolicy,
        setupCompletedAt: now,
        setupCompletedBy: userId,
    });

    return { success: true, organizationId };
}

export async function getUserById(ctx: { db: DatabaseReader }, userId: Id<'user'>) {
    return await ctx.db.get(userId);
}

export async function requireAdminUser(ctx: { db: DatabaseReader }, userId: Id<'user'>) {
    const user = await ctx.db.get(userId);
    if (!user || !isGlobalAdminRole(user.role)) {
        throw new ConvexError(ERROR_CODES.FORBIDDEN);
    }
    return user;
}

export async function ensureTestOrganizationForUser(
    ctx: MutationCtx,
    args: EnsureTestOrganizationArgs
) {
    const userId = args.userId;
    const now = Date.now();

    const currentSession = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .order('desc')
        .first();

    let membership = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .first();

    let organizationId: Id<'organization'>;

    if (membership) {
        organizationId = membership.organizationId;
    } else {
        const suffix = Math.random().toString(36).slice(2, 10);
        const organizationName = args.organizationName ?? `Test Org ${suffix}`;
        organizationId = await ctx.db.insert('organization', {
            name: organizationName,
            slug: slugify(organizationName),
            createdAt: now,
            metadata: JSON.stringify({
                description: 'Automatically created for E2E tests',
            }),
            logo: null,
        });

        await ctx.db.insert('member', {
            organizationId,
            userId,
            role: 'owner',
            createdAt: now,
        });
    }

    if (currentSession && currentSession.activeOrganizationId !== organizationId) {
        await ctx.db.patch(currentSession._id, {
            activeOrganizationId: organizationId,
        });
    }

    if (args.createPersonalCategory !== false) {
        const existingPersonalCategory = await ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .filter(q => q.eq(q.field('name'), 'Personal'))
            .first();

        if (!existingPersonalCategory) {
            await ctx.db.insert('categories', {
                userId,
                organizationId,
                name: 'Personal',
                color: '#3b82f6',
                icon: 'user',
                createdAt: now,
                updatedAt: now,
            });
        }
    }

    membership = await ctx.db
        .query('member')
        .withIndex('by_organizationId_and_userId', q =>
            q.eq('organizationId', organizationId).eq('userId', userId)
        )
        .first();

    return {
        organizationId,
        memberId: membership?._id ?? null,
    };
}
