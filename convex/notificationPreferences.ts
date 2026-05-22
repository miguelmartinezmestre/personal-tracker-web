import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { mutationWithRLS, queryWithRLS } from './rls';
import {
    getNotificationPreferencesForUser,
    shouldSendAchievementNotification,
    shouldSendOrganizationNotification,
    updateNotificationPreferencesForUser,
} from './domain/notifications/preferences';

export {
    shouldSendDeadlineNotification,
    shouldSendProgressNotification,
} from './domain/notifications/preferences';

export const getUserPreferences = queryWithRLS({
    args: {},
    handler: async ctx => {
        return await getNotificationPreferencesForUser(ctx, ctx.userId);
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
        return await updateNotificationPreferencesForUser(ctx, ctx.userId, args);
    },
});

export const shouldSendAchievementNotificationInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    handler: async (ctx, args) => {
        return await shouldSendAchievementNotification(ctx, args.userId);
    },
});

export const shouldSendOrganizationNotificationInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    handler: async (ctx, args) => {
        return await shouldSendOrganizationNotification(ctx, args.userId);
    },
});
