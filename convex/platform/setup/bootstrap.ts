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

type CompleteSetupArgs = ObjectType<typeof completeSetupArgsValidator>;

type EnsureTestOrganizationArgs = ObjectType<typeof ensureTestOrganizationInternalArgsValidator>;

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

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

export async function completePlatformSetup(
    ctx: MutationCtx,
    userId: Id<'user'>,
    args: CompleteSetupArgs
): Promise<{ success: true; organizationId: Id<'organization'> }> {
    const existingSettings = await ctx.db.query('platformSettings').first();
    if (existingSettings) {
        throw new ConvexError(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
    }

    const users = await ctx.db.query('user').take(2);
    const currentUser = await ctx.db.get(userId);

    if (!currentUser) {
        throw new ConvexError(ERROR_CODES.INTERNAL_ERROR);
    }

    if (users.length !== 1) {
        throw new ConvexError(ERROR_CODES.SETUP_USER_COUNT);
    }

    if (currentUser._id !== userId) {
        throw new ConvexError(ERROR_CODES.SETUP_USER_MISMATCH);
    }

    await ctx.db.patch(userId, { role: 'admin' });

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
    if (!user || user.role !== 'admin') {
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
