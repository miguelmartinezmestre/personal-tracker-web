import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError, v } from 'convex/values';
import { getAuthUserIdentity } from 'better-convex/auth';
import type { Id } from './_generated/dataModel';
import { ERROR_CODES } from './utils/constants';

export const isPlatformSetUp = query({
    args: {},
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();
        return settings !== null;
    },
});

export const getPublicPlatformSettings = query({
    args: {},
    handler: async ctx => {
        const settings = await ctx.db.query('platformSettings').first();
        if (!settings) return null;
        return {
            platformName: settings.platformName,
            defaultLanguage: settings.defaultLanguage,
            registrationPolicy: settings.registrationPolicy,
        };
    },
});

export const completeSetup = mutation({
    args: {
        platformName: v.string(),
        defaultLanguage: v.string(),
        registrationPolicy: v.string(),
        organizationName: v.string(),
        organizationLogo: v.optional(v.string()),
        categories: v.array(
            v.object({
                name: v.string(),
                color: v.string(),
                icon: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }

        const userId = identity.userId as Id<'user'>;

        const existingSettings = await ctx.db.query('platformSettings').first();
        if (existingSettings) {
            throw new ConvexError(ERROR_CODES.PLATFORM_ALREADY_CONFIGURED);
        }

        const allUsers = await ctx.db.query('user').collect();
        if (allUsers.length !== 1) {
            throw new ConvexError(ERROR_CODES.SETUP_USER_COUNT);
        }

        const currentUser = allUsers[0]!;
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
            organizationId = membership.organizationId as Id<'organization'>;
            await ctx.db.patch(organizationId, {
                name: args.organizationName,
                ...(args.organizationLogo ? { logo: args.organizationLogo } : {}),
            });
        } else {
            const now = Date.now();
            organizationId = await ctx.db.insert('organization', {
                name: args.organizationName,
                slug: args.organizationName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
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

        await ctx.db.insert('platformSettings', {
            platformName: args.platformName,
            defaultLanguage: args.defaultLanguage,
            registrationPolicy: args.registrationPolicy,
            setupCompletedAt: now,
            setupCompletedBy: userId,
        });

        return { success: true, organizationId };
    },
});

export const getUserByIdInternal = internalQuery({
    args: { userId: v.id('user') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

export const requireAdminInternal = internalQuery({
    args: { userId: v.id('user') },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || user.role !== 'admin') {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }
        return user;
    },
});

export const ensureTestOrganizationInternal = internalMutation({
    args: {
        userId: v.id('user'),
        organizationName: v.optional(v.string()),
        createPersonalCategory: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = args.userId;
        const now = Date.now();

        const sessions = await ctx.db
            .query('session')
            .withIndex('userId', q => q.eq('userId', userId))
            .collect();
        const currentSession =
            sessions.length === 0
                ? null
                : sessions.reduce((best, s) => (s.updatedAt >= best.updatedAt ? s : best));

        let membership = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .first();

        let organizationId: Id<'organization'>;

        if (membership) {
            organizationId = membership.organizationId as Id<'organization'>;
        } else {
            const suffix = Math.random().toString(36).slice(2, 10);
            const organizationName = args.organizationName ?? `Test Org ${suffix}`;
            organizationId = await ctx.db.insert('organization', {
                name: organizationName,
                slug: organizationName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
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
    },
});

export const ensureTestOrganization = mutation({
    args: {
        organizationName: v.optional(v.string()),
        createPersonalCategory: v.optional(v.boolean()),
    },
    handler: async (
        ctx,
        args
    ): Promise<{ organizationId: Id<'organization'>; memberId: Id<'member'> | null }> => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.SETUP_AUTH_REQUIRED);
        }

        const userId = identity.userId as Id<'user'>;

        if (process.env.ALLOW_SETUP_TEST !== 'true') {
            await ctx.runQuery(internal.setup.requireAdminInternal, { userId });
        }

        return await ctx.runMutation(internal.setup.ensureTestOrganizationInternal, {
            userId,
            organizationName: args.organizationName,
            createPersonalCategory: args.createPersonalCategory,
        });
    },
});
