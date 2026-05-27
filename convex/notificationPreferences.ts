import { v } from 'convex/values';
import { mutationWithRLS, queryWithRLS } from './rls';
import {
    getNotificationPreferencesForUser,
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