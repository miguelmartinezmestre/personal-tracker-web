import type { Rules } from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';

export async function createRlsRules(
    userId: Id<'user'>,
    role: string,
    memberRole: string | null,
    ctx: QueryCtx,
    organizationId?: Id<'organization'> | null
) {
    const isGlobalAdmin = role === 'admin';
    const isOrgAdmin =
        Boolean(organizationId) && (memberRole === 'admin' || memberRole === 'owner');
    const activeOrgMembershipCache = new Map<string, Promise<boolean>>();
    const normalizeUserId = (targetUserId: Id<'user'> | string) => {
        return ctx.db.normalizeId('user', targetUserId);
    };
    const normalizeOrganizationId = (targetOrganizationId: Id<'organization'> | string | null) => {
        if (targetOrganizationId === null) return null;
        return ctx.db.normalizeId('organization', targetOrganizationId);
    };
    const isActiveOrganization = (targetOrganizationId?: Id<'organization'> | null) => {
        return (
            Boolean(organizationId) &&
            Boolean(targetOrganizationId) &&
            targetOrganizationId === organizationId
        );
    };
    const hasActiveOrgAdminAccess = (targetOrganizationId?: Id<'organization'> | null) => {
        return isOrgAdmin && isActiveOrganization(targetOrganizationId);
    };
    const isActiveOrganizationMember = async (targetUserId: Id<'user'> | string) => {
        const normalizedUserId = normalizeUserId(targetUserId);
        if (!organizationId || !normalizedUserId) return false;

        let cached = activeOrgMembershipCache.get(normalizedUserId);
        if (!cached) {
            cached = ctx.db
                .query('member')
                .withIndex('by_organizationId_and_userId', q =>
                    q.eq('organizationId', organizationId).eq('userId', normalizedUserId)
                )
                .first()
                .then(member => member !== null);
            activeOrgMembershipCache.set(normalizedUserId, cached);
        }

        return await cached;
    };
    const hasActiveOrgAdminAccessToUser = async (targetUserId: Id<'user'> | string) => {
        return isOrgAdmin && (await isActiveOrganizationMember(targetUserId));
    };
    const canAccessObjective = (objective: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        scope?: string;
    }) => {
        if (isGlobalAdmin) return true;
        if (objective.scope === 'organization') {
            return isActiveOrganization(objective.organizationId);
        }

        if (objective.userId === userId) {
            return isActiveOrganization(objective.organizationId);
        }

        return hasActiveOrgAdminAccess(objective.organizationId);
    };

    return {
        objectives: {
            read: async (_, objective) => canAccessObjective(objective),
            insert: async (_, objective) => canAccessObjective(objective),
            modify: async (_, objective) => canAccessObjective(objective),
        },
        progressUpdates: {
            read: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
            insert: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
            modify: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective) return false;
                return canAccessObjective(objective);
            },
        },
        notifications: {
            read: async (_, notification) => {
                if (isGlobalAdmin) return true;
                if (hasActiveOrgAdminAccess(notification.organizationId)) return true;

                return (
                    notification.userId === userId &&
                    isActiveOrganization(notification.organizationId)
                );
            },
            insert: async (_, notification) => {
                if (isGlobalAdmin) return true;
                if (!isActiveOrganization(notification.organizationId)) return false;
                if (notification.userId === userId) return true;
                if (
                    hasActiveOrgAdminAccess(notification.organizationId) &&
                    (await isActiveOrganizationMember(notification.userId))
                ) {
                    return true;
                }
                if (!notification.objective) return false;
                const objective = await ctx.db.get('objectives', notification.objective);
                if (!objective || notification.userId !== objective.userId) return false;
                return canAccessObjective(objective);
            },
            modify: async (_, notification) => {
                if (isGlobalAdmin) return true;
                if (hasActiveOrgAdminAccess(notification.organizationId)) return true;

                return (
                    notification.userId === userId &&
                    isActiveOrganization(notification.organizationId)
                );
            },
        },
        notificationPreferences: {
            read: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(row.userId)) return true;
                return row.userId === userId;
            },
            insert: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(row.userId)) return true;
                return row.userId === userId;
            },
            modify: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(row.userId)) return true;
                return row.userId === userId;
            },
        },
        auditLogs: {
            read: async () => isGlobalAdmin,
            insert: async () => false,
            modify: async () => false,
        },
        achievementDefinitions: {
            read: async () => true,
            insert: async () => isGlobalAdmin,
            modify: async () => isGlobalAdmin,
        },
        obtainedAchievements: {
            read: async (_, achievement) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(achievement.userId)) return true;

                return achievement.userId === userId;
            },
            insert: async () => false,
            modify: async () => false,
        },
        organizationAchievements: {
            read: async (_, achievement) => {
                if (isGlobalAdmin) return true;
                return isActiveOrganization(achievement.organization);
            },
            insert: async () => false,
            modify: async () => false,
        },
        organizationAchievementContributors: {
            read: async (_, row) => {
                if (isGlobalAdmin) return true;
                if (row.userId === userId) return true;
                const orgAchievement = await ctx.db.get(
                    'organizationAchievements',
                    row.organizationAchievementId
                );
                if (!orgAchievement) return false;
                return isActiveOrganization(orgAchievement.organization);
            },
            insert: async () => false,
            modify: async () => false,
        },
        member: {
            read: async (_, member) => {
                if (isGlobalAdmin) return true;
                if (member.userId === userId) return true;
                return isActiveOrganization(member.organizationId);
            },
            insert: async () => false,
            modify: async () => false,
        },
        user: {
            read: async (_, user) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(user._id)) return true;
                return user._id === userId;
            },
            insert: async () => false,
            modify: async () => isGlobalAdmin,
        },
        session: {
            read: async (_, session) => {
                if (isGlobalAdmin) return true;
                const sessionUserId = normalizeUserId(session.userId);
                if (sessionUserId === userId) return true;
                const sessionOrganizationId =
                    typeof session.activeOrganizationId === 'string'
                        ? normalizeOrganizationId(session.activeOrganizationId)
                        : null;
                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
            insert: async () => false,
            modify: async (_, session) => {
                if (isGlobalAdmin) return true;
                const sessionUserId = normalizeUserId(session.userId);
                if (sessionUserId === userId) return true;

                const sessionOrganizationId =
                    typeof session.activeOrganizationId === 'string'
                        ? normalizeOrganizationId(session.activeOrganizationId)
                        : null;
                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
        },
        categories: {
            read: async (_, category) => {
                if (isGlobalAdmin) return true;
                if (category.userId === userId && isActiveOrganization(category.organizationId)) {
                    return true;
                }
                return isActiveOrganization(category.organizationId);
            },
            insert: async (_, category) => {
                if (isGlobalAdmin) return true;
                return isActiveOrganization(category.organizationId);
            },
            modify: async (_, category) => {
                if (isGlobalAdmin) return true;
                return isActiveOrganization(category.organizationId);
            },
        },
        platformSettings: {
            read: async () => isGlobalAdmin,
            insert: async () => false,
            modify: async () => false,
        },
    } satisfies Rules<QueryCtx, DataModel>;
}
