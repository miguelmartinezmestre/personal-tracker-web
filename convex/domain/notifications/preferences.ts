import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
    achievementNotifications: true,
    deadlineNotifications: true,
    progressNotifications: true,
    organizationNotifications: true,
};

export type NotificationPreferencePatch = Partial<typeof DEFAULT_NOTIFICATION_PREFERENCES>;

export async function getNotificationPreferencesForUser(
    ctx: { db: DatabaseReader },
    userId: Id<'user'>
) {
    const preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (preferences) {
        return {
            achievementNotifications: preferences.achievementNotifications,
            deadlineNotifications: preferences.deadlineNotifications,
            progressNotifications: preferences.progressNotifications,
            organizationNotifications: preferences.organizationNotifications,
        };
    }

    return DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function updateNotificationPreferencesForUser(
    ctx: MutationCtx,
    userId: Id<'user'>,
    patch: NotificationPreferencePatch
) {
    const existing = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (existing) {
        const updateFields: Record<string, boolean> = {};

        if (patch.achievementNotifications !== undefined) {
            updateFields.achievementNotifications = patch.achievementNotifications;
        }
        if (patch.deadlineNotifications !== undefined) {
            updateFields.deadlineNotifications = patch.deadlineNotifications;
        }
        if (patch.progressNotifications !== undefined) {
            updateFields.progressNotifications = patch.progressNotifications;
        }
        if (patch.organizationNotifications !== undefined) {
            updateFields.organizationNotifications = patch.organizationNotifications;
        }

        if (Object.keys(updateFields).length > 0) {
            await ctx.db.patch('notificationPreferences', existing._id, updateFields);
        }

        return null;
    }

    await ctx.db.insert('notificationPreferences', {
        userId,
        achievementNotifications:
            patch.achievementNotifications ??
            DEFAULT_NOTIFICATION_PREFERENCES.achievementNotifications,
        deadlineNotifications:
            patch.deadlineNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.deadlineNotifications,
        progressNotifications:
            patch.progressNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.progressNotifications,
        organizationNotifications:
            patch.organizationNotifications ??
            DEFAULT_NOTIFICATION_PREFERENCES.organizationNotifications,
    });

    return null;
}

async function shouldSendPreference(
    ctx: MutationCtx,
    userId: Id<'user'>,
    key: keyof typeof DEFAULT_NOTIFICATION_PREFERENCES
): Promise<boolean> {
    const preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (!preferences) {
        return true;
    }

    return preferences[key];
}

export async function shouldSendDeadlineNotification(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<boolean> {
    return await shouldSendPreference(ctx, userId, 'deadlineNotifications');
}

export async function shouldSendProgressNotification(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<boolean> {
    return await shouldSendPreference(ctx, userId, 'progressNotifications');
}

export async function shouldSendAchievementNotification(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<boolean> {
    return await shouldSendPreference(ctx, userId, 'achievementNotifications');
}

export async function shouldSendOrganizationNotification(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<boolean> {
    return await shouldSendPreference(ctx, userId, 'organizationNotifications');
}
