import { v } from 'convex/values';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import {
    getNotificationPreferencesForUser,
    updateNotificationPreferencesForUser,
} from './domain/notifications/preferences';

const notificationPreferencesResponseValidator = v.object({
    _id: v.optional(v.id('notificationPreferences')),
    _creationTime: v.optional(v.number()),
    userId: v.id('user'),
    achievementNotifications: v.boolean(),
    deadlineNotifications: v.boolean(),
    progressNotifications: v.boolean(),
    organizationNotifications: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
});

export {
    shouldSendDeadlineNotification,
    shouldSendProgressNotification,
} from './domain/notifications/preferences';

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
    returns: v.object({ success: v.boolean(), message: v.string() }),
    handler: async (ctx, args) => {
        return await updateNotificationPreferencesForUser(ctx, ctx.userId, args);
    },
});
