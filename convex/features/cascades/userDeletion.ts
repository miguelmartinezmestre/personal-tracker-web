import type { MutationCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';
import { deleteUserMembershipsBatch as deleteAuthMembershipsBatch } from '../organizations/memberships';
import { removeSessionsForUserBatch } from '../auth/sessions';
import { anonymizeAccount, deleteAccountsBatch } from '../auth/accountDeletion';

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

export async function anonymizeUser(ctx: MutationCtx, userId: string) {
    await anonymizeAccount(ctx, userId);
}

export async function deleteUserSessionsBatch(ctx: MutationCtx, userId: string): Promise<number> {
    const { deleted } = await removeSessionsForUserBatch(ctx, {
        userId,
        batchSize: USER_DELETION_BATCH_SIZE,
    });

    return deleted;
}

export async function deleteUserAccountsBatch(ctx: MutationCtx, userId: string): Promise<number> {
    return await deleteAccountsBatch(ctx, userId, USER_DELETION_BATCH_SIZE);
}

export async function deleteUserNotificationsBatch(
    ctx: MutationCtx,
    userId: string
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
    userId: string
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
    userId: string
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
    userId: string
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
