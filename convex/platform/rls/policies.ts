import type { Rules } from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { isGlobalAdminRole } from '../../../shared/platform-roles';

export async function createRlsRules(
    userId: Id<'user'>,
    role: string,
    memberRole: string | null,
    ctx: QueryCtx,
    organizationId?: Id<'organization'> | null,
    email?: string | null
) {
    const isGlobalAdmin = isGlobalAdminRole(role);
    const isOrgAdmin =
        Boolean(organizationId) && (memberRole === 'admin' || memberRole === 'owner');
    let pendingInvitationsForEmailPromise: Promise<
        Array<{
            organizationId: Id<'organization'>;
            inviterId: Id<'user'>;
        }>
    > | null = null;

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
        const normalizedUserId = ctx.db.normalizeId('user', targetUserId);
        if (!organizationId || !normalizedUserId) return false;

        return await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', organizationId).eq('userId', normalizedUserId)
            )
            .first()
            .then(member => member !== null);
    };
    const hasActiveOrgAdminAccessToUser = async (targetUserId: Id<'user'> | string) => {
        return isOrgAdmin && (await isActiveOrganizationMember(targetUserId));
    };
    const membershipRoleForOrganization = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        const normalizedOrganizationId = targetOrganizationId
            ? ctx.db.normalizeId('organization', targetOrganizationId)
            : null;
        if (!normalizedOrganizationId) return null;

        return await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', normalizedOrganizationId).eq('userId', userId)
            )
            .first()
            .then(member => member?.role ?? null);
    };
    const isMemberOfOrganization = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        return (await membershipRoleForOrganization(targetOrganizationId)) !== null;
    };
    const hasOrganizationAdminAccess = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        if (isGlobalAdmin) return true;
        const targetRole = await membershipRoleForOrganization(targetOrganizationId);
        return targetRole === 'admin' || targetRole === 'owner';
    };
    const currentUserOrganizationIds = async () => {
        return await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .take(1000)
            .then(members => new Set(members.map(member => member.organizationId)));
    };
    const organizationIdsForUser = async (targetUserId: Id<'user'> | string) => {
        const normalizedUserId = ctx.db.normalizeId('user', targetUserId);
        if (!normalizedUserId) return new Set<Id<'organization'>>();

        return ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', normalizedUserId))
            .take(1000)
            .then(members => new Set(members.map(member => member.organizationId)));
    };
    const sharesOrganizationWithUser = async (targetUserId: Id<'user'> | string) => {
        const normalizedUserId = ctx.db.normalizeId('user', targetUserId);
        if (!normalizedUserId) return false;
        if (normalizedUserId === userId) return true;

        const [currentOrganizationIds, targetOrganizationIds] = await Promise.all([
            currentUserOrganizationIds(),
            organizationIdsForUser(normalizedUserId),
        ]);

        for (const targetOrganizationId of targetOrganizationIds) {
            if (currentOrganizationIds.has(targetOrganizationId)) {
                return true;
            }
        }

        return false;
    };
    const pendingInvitationsForEmail = async () => {
        if (!email) return [];
        if (!pendingInvitationsForEmailPromise) {
            const now = Date.now();
            pendingInvitationsForEmailPromise = ctx.db
                .query('invitation')
                .withIndex('by_email_status_expiresAt', q =>
                    q.eq('email', email).eq('status', 'pending').gt('expiresAt', now)
                )
                .take(1000)
                .then(invitations =>
                    invitations.map(invitation => ({
                        organizationId: invitation.organizationId,
                        inviterId: invitation.inviterId,
                    }))
                );
        }

        return await pendingInvitationsForEmailPromise;
    };
    const hasPendingInvitationForOrganization = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        const normalizedOrganizationId = targetOrganizationId
            ? ctx.db.normalizeId('organization', targetOrganizationId)
            : null;
        if (!normalizedOrganizationId) return false;

        return (await pendingInvitationsForEmail()).some(
            invitation => invitation.organizationId === normalizedOrganizationId
        );
    };
    const isInviterForPendingInvitation = async (targetUserId: Id<'user'> | string) => {
        const normalizedUserId = ctx.db.normalizeId('user', targetUserId);
        if (!normalizedUserId) return false;

        return (await pendingInvitationsForEmail()).some(
            invitation => invitation.inviterId === normalizedUserId
        );
    };
    const canAccessObjective = (objective: { organizationId: Id<'organization'> }) => {
        if (isGlobalAdmin) return true;
        // Tenant model: any member of the active organization can access its objectives.
        return isActiveOrganization(objective.organizationId);
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
                return await isMemberOfOrganization(member.organizationId);
            },
            insert: async () => false,
            modify: async () => false,
        },
        user: {
            read: async (_, user) => {
                if (isGlobalAdmin) return true;
                if (await hasActiveOrgAdminAccessToUser(user._id)) return true;
                if (await sharesOrganizationWithUser(user._id)) return true;
                if (await isInviterForPendingInvitation(user._id)) return true;
                return user._id === userId;
            },
            insert: async () => false,
            modify: async () => isGlobalAdmin,
        },
        organization: {
            read: async (_, organization) => {
                if (isGlobalAdmin) return true;
                if (await isMemberOfOrganization(organization._id)) return true;
                return await hasPendingInvitationForOrganization(organization._id);
            },
            insert: async () => false,
            modify: async () => false,
        },
        invitation: {
            read: async (_, invitation) => {
                if (isGlobalAdmin) return true;
                if (await hasOrganizationAdminAccess(invitation.organizationId)) return true;
                return (
                    Boolean(email) &&
                    invitation.email === email &&
                    invitation.status === 'pending' &&
                    invitation.expiresAt > Date.now()
                );
            },
            insert: async () => false,
            modify: async (_, invitation) => {
                return await hasOrganizationAdminAccess(invitation.organizationId);
            },
        },
        session: {
            read: async (_, session) => {
                if (isGlobalAdmin) return true;
                const sessionUserId = ctx.db.normalizeId('user', session.userId);
                if (sessionUserId === userId) return true;
                const sessionOrganizationId =
                    typeof session.activeOrganizationId === 'string'
                        ? ctx.db.normalizeId('organization', session.activeOrganizationId)
                        : null;
                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
            insert: async () => false,
            modify: async (_, session) => {
                if (isGlobalAdmin) return true;
                const sessionUserId = ctx.db.normalizeId('user', session.userId);
                if (sessionUserId === userId) return true;

                const sessionOrganizationId =
                    typeof session.activeOrganizationId === 'string'
                        ? ctx.db.normalizeId('organization', session.activeOrganizationId)
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
