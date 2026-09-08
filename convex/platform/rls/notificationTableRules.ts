import type { Doc } from '../../_generated/dataModel';
import { rlsAllow, rlsDeny, rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

export function notificationTableRules(helpers: RlsHelpers) {
    const {
        ctx,
        userId,
        isGlobalAdmin,
        isActiveOrganization,
        hasActiveOrgAdminAccess,
        isActiveOrganizationMember,
        hasActiveOrgAdminAccessToUser,
        canAccessObjectiveOrg,
    } = helpers;

    return {
        notifications: {
            read: (_ctx: QueryLike, notification: Doc<'notifications'>) => {
                if (isGlobalAdmin) {
                    return rlsAllow();
                }
                if (hasActiveOrgAdminAccess(notification.organizationId)) {
                    return rlsAllow();
                }

                return rlsWhen(
                    notification.userId === userId &&
                        isActiveOrganization(notification.organizationId)
                );
            },
            insert: async (_ctx: QueryLike, notification: RlsInsertDoc<'notifications'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (!isActiveOrganization(notification.organizationId)) {
                    return false;
                }
                if (notification.userId === userId) {
                    return true;
                }
                if (
                    hasActiveOrgAdminAccess(notification.organizationId) &&
                    (await isActiveOrganizationMember(notification.userId))
                ) {
                    return true;
                }
                if (!notification.objective) {
                    return false;
                }
                const objective = await ctx.db.get('objectives', notification.objective);
                if (!objective || notification.userId !== objective.ownerId) {
                    return false;
                }
                return canAccessObjectiveOrg(objective);
            },
            modify: (_ctx: QueryLike, notification: Doc<'notifications'>) => {
                if (isGlobalAdmin) {
                    return rlsAllow();
                }
                if (hasActiveOrgAdminAccess(notification.organizationId)) {
                    return rlsAllow();
                }

                return rlsWhen(
                    notification.userId === userId &&
                        isActiveOrganization(notification.organizationId)
                );
            },
        },
        notificationPreferences: {
            read: async (_ctx: QueryLike, row: Doc<'notificationPreferences'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (await hasActiveOrgAdminAccessToUser(row.userId)) {
                    return true;
                }
                return row.userId === userId;
            },
            insert: async (_ctx: QueryLike, row: RlsInsertDoc<'notificationPreferences'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (await hasActiveOrgAdminAccessToUser(row.userId)) {
                    return true;
                }
                return row.userId === userId;
            },
            modify: async (_ctx: QueryLike, row: Doc<'notificationPreferences'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (await hasActiveOrgAdminAccessToUser(row.userId)) {
                    return true;
                }
                return row.userId === userId;
            },
        },
        auditLogs: {
            read: () => rlsWhen(isGlobalAdmin),
            insert: rlsDeny,
            modify: rlsDeny,
        },
        achievementDefinitions: {
            read: rlsAllow,
            insert: () => rlsWhen(isGlobalAdmin),
            modify: () => rlsWhen(isGlobalAdmin),
        },
        obtainedAchievements: {
            read: async (_ctx: QueryLike, achievement: Doc<'obtainedAchievements'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (await hasActiveOrgAdminAccessToUser(achievement.userId)) {
                    return true;
                }

                return achievement.userId === userId;
            },
            insert: rlsDeny,
            modify: rlsDeny,
        },
        organizationAchievements: {
            read: (_ctx: QueryLike, achievement: Doc<'organizationAchievements'>) => {
                if (isGlobalAdmin) {
                    return rlsAllow();
                }
                return rlsWhen(isActiveOrganization(achievement.organization));
            },
            insert: rlsDeny,
            modify: rlsDeny,
        },
        organizationAchievementContributors: {
            read: async (_ctx: QueryLike, row: Doc<'organizationAchievementContributors'>) => {
                if (isGlobalAdmin) {
                    return true;
                }
                if (row.userId === userId) {
                    return true;
                }
                const orgAchievement = await ctx.db.get(
                    'organizationAchievements',
                    row.organizationAchievementId
                );
                if (!orgAchievement) {
                    return false;
                }
                return isActiveOrganization(orgAchievement.organization);
            },
            insert: rlsDeny,
            modify: rlsDeny,
        },
    };
}
