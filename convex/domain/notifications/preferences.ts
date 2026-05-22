import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
    achievementNotifications: true,
    deadlineNotifications: true,
    progressNotifications: true,
    organizationNotifications: true,
    emailDigestEnabled: false,
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
            ...preferences,
            achievementNotifications:
                preferences.achievementNotifications ??
                DEFAULT_NOTIFICATION_PREFERENCES.achievementNotifications,
            deadlineNotifications:
                preferences.deadlineNotifications ??
                DEFAULT_NOTIFICATION_PREFERENCES.deadlineNotifications,
            progressNotifications:
                preferences.progressNotifications ??
                DEFAULT_NOTIFICATION_PREFERENCES.progressNotifications,
            organizationNotifications:
                preferences.organizationNotifications ??
                DEFAULT_NOTIFICATION_PREFERENCES.organizationNotifications,
            emailDigestEnabled:
                preferences.emailDigestEnabled ??
                DEFAULT_NOTIFICATION_PREFERENCES.emailDigestEnabled,
        };
    }

    return {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

export async function updateNotificationPreferencesForUser(
    ctx: MutationCtx,
    userId: Id<'user'>,
    patch: NotificationPreferencePatch
) {
    const now = Date.now();

    const existing = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (existing) {
        const updateFields: Record<string, boolean | number> = {
            updatedAt: now,
        };

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
        if (patch.emailDigestEnabled !== undefined) {
            updateFields.emailDigestEnabled = patch.emailDigestEnabled;
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
            patch.achievementNotifications ??
            DEFAULT_NOTIFICATION_PREFERENCES.achievementNotifications,
        deadlineNotifications:
            patch.deadlineNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.deadlineNotifications,
        progressNotifications:
            patch.progressNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.progressNotifications,
        organizationNotifications:
            patch.organizationNotifications ??
            DEFAULT_NOTIFICATION_PREFERENCES.organizationNotifications,
        emailDigestEnabled:
            patch.emailDigestEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.emailDigestEnabled,
        createdAt: now,
        updatedAt: now,
    });

    return {
        success: true,
        message: 'Preferences created successfully',
    };
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

    return preferences[key] ?? true;
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
