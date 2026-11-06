import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';
import { deleteUserMembershipsBatch as deleteAuthMembershipsBatch } from '../organizations/memberships';

export const USER_DELETION_BATCH_SIZE = 50;

export type UserDeletionPhase =
    | 'sessions'
    | 'accounts'
    | 'objectivePermissions'
    | 'notifications'
    | 'achievements'
    | 'memberships';

export type UserDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: UserDeletionPhase;
};

export async function anonymizeUser(ctx: MutationCtx, userId: Id<'user'>) {
    const user = await ctx.db.get('user', userId);

    if (!user || user.deletedAt !== undefined) {
        return;
    }

    const now = Date.now();
    await ctx.db.patch('user', userId, {
        email: `deleted-${String(userId)}@deleted.invalid`,
        emailVerified: false,
        image: null,
        userId: null,
        role: null,
        banned: true,
        banReason: 'Account deleted',
        banExpires: null,
        deletedAt: now,
        updatedAt: now,
    });
}

export async function deleteUserSessionsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('session', row._id);
    }

    return rows.length;
}

export async function deleteUserAccountsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('account')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('account', row._id);
    }

    return rows.length;
}

export async function deleteUserNotificationsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('notifications')
        .withIndex('by_user_organization_date', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('notifications', row._id);
    }

    if (rows.length < USER_DELETION_BATCH_SIZE) {
        const preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', userId))
            .unique();

        if (preferences) {
            await ctx.db.delete('notificationPreferences', preferences._id);
        }
    }

    return rows.length;
}

export async function deleteUserAchievementsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('obtainedAchievements')
        .withIndex('by_user_achievement', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('obtainedAchievements', row._id);
    }

    return rows.length;
}

export async function deleteUserObjectivePermissionsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const rows = await ctx.db
        .query('objectivePermissions')
        .withIndex('by_user_organization', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('objectivePermissions', row._id);
    }

    return rows.length;
}

export async function deleteUserMembershipsBatch(
    ctx: MutationCtx,
    userId: Id<'user'>
): Promise<number> {
    const { deleted, deletedOrganizationIds } = await deleteAuthMembershipsBatch(
        ctx,
        userId,
        USER_DELETION_BATCH_SIZE
    );

    for (const organizationId of deletedOrganizationIds) {
        await ctx.scheduler.runAfter(0, internal.cascades.continueOrganizationDeletionCascade, {
            organizationId,
            phase: 'progressUpdates',
        });
    }

    return deleted;
}
