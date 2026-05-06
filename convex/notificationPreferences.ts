import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { internalMutation, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

const DEFAULT_PREFERENCES = {
    achievementNotifications: true,
    deadlineNotifications: true,
    progressNotifications: true,
    organizationNotifications: true,
    emailDigestEnabled: false,
};

export const getUserPreferences = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', userId))
            .first();

        if (preferences) {
            return {
                ...preferences,
                achievementNotifications:
                    preferences.achievementNotifications ??
                    DEFAULT_PREFERENCES.achievementNotifications,
                deadlineNotifications:
                    preferences.deadlineNotifications ?? DEFAULT_PREFERENCES.deadlineNotifications,
                progressNotifications:
                    preferences.progressNotifications ?? DEFAULT_PREFERENCES.progressNotifications,
                organizationNotifications:
                    preferences.organizationNotifications ??
                    DEFAULT_PREFERENCES.organizationNotifications,
                emailDigestEnabled:
                    preferences.emailDigestEnabled ?? DEFAULT_PREFERENCES.emailDigestEnabled,
            };
        }

        return {
            userId,
            ...DEFAULT_PREFERENCES,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    },
});

export const updateUserPreferences = mutationWithRLS({
    args: {
        achievementNotifications: v.optional(v.boolean()),
        deadlineNotifications: v.optional(v.boolean()),
        progressNotifications: v.optional(v.boolean()),
        organizationNotifications: v.optional(v.boolean()),
        emailDigestEnabled: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const now = Date.now();

        const existing = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', userId))
            .first();

        if (existing) {
            const updateFields: Record<string, boolean | number> = {
                updatedAt: now,
            };

            if (args.achievementNotifications !== undefined) {
                updateFields.achievementNotifications = args.achievementNotifications;
            }
            if (args.deadlineNotifications !== undefined) {
                updateFields.deadlineNotifications = args.deadlineNotifications;
            }
            if (args.progressNotifications !== undefined) {
                updateFields.progressNotifications = args.progressNotifications;
            }
            if (args.organizationNotifications !== undefined) {
                updateFields.organizationNotifications = args.organizationNotifications;
            }
            if (args.emailDigestEnabled !== undefined) {
                updateFields.emailDigestEnabled = args.emailDigestEnabled;
            }

            await ctx.db.patch(existing._id, updateFields);

            return {
                success: true,
                message: 'Preferences updated successfully',
            };
        }

        await ctx.db.insert('notificationPreferences', {
            userId,
            achievementNotifications:
                args.achievementNotifications ?? DEFAULT_PREFERENCES.achievementNotifications,
            deadlineNotifications:
                args.deadlineNotifications ?? DEFAULT_PREFERENCES.deadlineNotifications,
            progressNotifications:
                args.progressNotifications ?? DEFAULT_PREFERENCES.progressNotifications,
            organizationNotifications:
                args.organizationNotifications ?? DEFAULT_PREFERENCES.organizationNotifications,
            emailDigestEnabled: args.emailDigestEnabled ?? DEFAULT_PREFERENCES.emailDigestEnabled,
            createdAt: now,
            updatedAt: now,
        });

        return {
            success: true,
            message: 'Preferences created successfully',
        };
    },
});

export async function shouldSendDeadlineNotification(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<boolean> {
    const preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (!preferences) {
        return true;
    }

    return preferences.deadlineNotifications ?? true;
}

export async function shouldSendProgressNotification(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<boolean> {
    const preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (!preferences) {
        return true;
    }

    return preferences.progressNotifications ?? true;
}

export const shouldSendAchievementNotificationInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    handler: async (ctx, args) => {
        const preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', args.userId))
            .first();

        if (!preferences) {
            return true;
        }

        return preferences.achievementNotifications ?? true;
    },
});

export const shouldSendOrganizationNotificationInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    handler: async (ctx, args) => {
        const preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', args.userId))
            .first();

        if (!preferences) {
            return true;
        }

        return preferences.organizationNotifications ?? true;
    },
});
