import { v } from 'convex/values';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import {
    getNotificationPreferencesForUser,
    updateNotificationPreferencesForUser,
} from './domain/notifications/preferences';

const notificationPreferencesResponseValidator = v.object({
    achievementNotifications: v.boolean(),
    deadlineNotifications: v.boolean(),
    progressNotifications: v.boolean(),
    organizationNotifications: v.boolean(),
});

export const getUserPreferences = queryWithRLS({
    args: {},
    returns: notificationPreferencesResponseValidator,
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
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        return await updateNotificationPreferencesForUser(ctx, ctx.userId, args);
    },
});
