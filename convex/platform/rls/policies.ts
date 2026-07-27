import type { Rules } from 'convex-helpers/server/rowLevelSecurity';
import type { DataModel, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import {
    buildPermissionSubject,
    canEditProgress,
    canObjective,
} from '../../domain/objectives/permissions';
import { getCollaboratorRoleForUser } from '../../domain/objectives/collaborators';
import { isGlobalAdminRole } from '../../../shared/platform-roles';

export async function createRlsRules(
    userId: Id<'user'>,
    role: string,
    memberRole: string | null,
    ctx: QueryCtx,
    organizationId?: Id<'organization'> | null,
    email?: string | null
) {
    // Convex freezes Date.now() for the lifetime of one function execution. Keep
    // authorization decisions on that trusted server timestamp instead of on a
    // caller-provided reference time used only to refresh reactive queries.
    const authorizationNow = Date.now();
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
    const pendingInvitationsForEmail = async () => {
        if (!email) return [];
        if (!pendingInvitationsForEmailPromise) {
            pendingInvitationsForEmailPromise = ctx.db
                .query('invitation')
                .withIndex('by_email_status_expiresAt', q =>
                    q.eq('email', email).eq('status', 'pending').gt('expiresAt', authorizationNow)
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
    const canAccessObjectiveOrg = (objective: { organizationId: Id<'organization'> }) => {
        if (isGlobalAdmin) return true;
        return isActiveOrganization(objective.organizationId);
    };

    const collaboratorRoleCache = new Map<
        string,
        Awaited<ReturnType<typeof getCollaboratorRoleForUser>>
    >();
    const resolveCollaboratorRole = async (objectiveId: Id<'objectives'>) => {
        const cacheKey = String(objectiveId);
        if (!collaboratorRoleCache.has(cacheKey)) {
            collaboratorRoleCache.set(
                cacheKey,
                await getCollaboratorRoleForUser(ctx, objectiveId, userId)
            );
        }
        return collaboratorRoleCache.get(cacheKey) ?? null;
    };

    const buildSubject = async (objectiveId: Id<'objectives'>) =>
        buildPermissionSubject({
            userId,
            platformRole: role,
            memberRole,
            collaboratorRole: await resolveCollaboratorRole(objectiveId),
        });

    return {
        objectives: {
            read: async (_, objective) => {
                if (!canAccessObjectiveOrg(objective)) return false;
                const subject = await buildSubject(objective._id);
                return canObjective('view', subject, objective);
            },
            insert: async (_, objective) => canAccessObjectiveOrg(objective),
            modify: async (_, objective) => {
                if (!canAccessObjectiveOrg(objective)) return false;
                const subject = await buildSubject(objective._id);
                return (
                    canObjective('editDefinition', subject, objective) ||
                    canObjective('delete', subject, objective) ||
                    canObjective('restore', subject, objective) ||
                    canObjective('setVisibility', subject, objective) ||
                    canObjective('transferOwnership', subject, objective) ||
                    canObjective('contributeProgress', subject, objective)
                );
            },
        },
        objectiveCollaborators: {
            read: async (_, collaborator) => {
                if (isGlobalAdmin) return true;
                if (!isActiveOrganization(collaborator.organizationId)) return false;
                if (collaborator.userId === userId) return true;

                const objective = await ctx.db.get('objectives', collaborator.objectiveId);
                if (!objective) return false;

                const subject = await buildSubject(objective._id);
                return canObjective('view', subject, objective);
            },
            insert: async (_, collaborator) => {
                if (isGlobalAdmin) return true;
                if (!isActiveOrganization(collaborator.organizationId)) return false;

                const objective = await ctx.db.get('objectives', collaborator.objectiveId);
                if (!objective) return false;

                const subject = await buildSubject(objective._id);
                return canObjective('manageCollaborators', subject, objective);
            },
            modify: async (_, collaborator) => {
                if (isGlobalAdmin) return true;
                if (!isActiveOrganization(collaborator.organizationId)) return false;

                const objective = await ctx.db.get('objectives', collaborator.objectiveId);
                if (!objective) return false;

                const subject = await buildSubject(objective._id);
                return canObjective('manageCollaborators', subject, objective);
            },
        },
        progressUpdates: {
            read: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective || !canAccessObjectiveOrg(objective)) return false;

                const subject = await buildSubject(objective._id);
                return canObjective('view', subject, objective);
            },
            insert: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective || !canAccessObjectiveOrg(objective)) return false;

                const subject = await buildSubject(objective._id);
                return canObjective('contributeProgress', subject, objective);
            },
            modify: async (_, progressUpdate) => {
                if (isGlobalAdmin) return true;

                const objective = await ctx.db.get('objectives', progressUpdate.objective);
                if (!objective || !canAccessObjectiveOrg(objective)) return false;

                const subject = await buildSubject(objective._id);
                return canEditProgress(subject, {
                    authorId: progressUpdate.createdBy,
                    ownerId: objective.ownerId,
                });
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
                if (!objective || notification.userId !== objective.ownerId) return false;
                return canAccessObjectiveOrg(objective);
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

                const normalizedTargetUserId = ctx.db.normalizeId('user', user._id);
                if (normalizedTargetUserId) {
                    if (normalizedTargetUserId === userId) {
                        return true;
                    }

                    const [currentOrganizationIds, targetOrganizationIds] = await Promise.all([
                        ctx.db
                            .query('member')
                            .withIndex('userId', q => q.eq('userId', userId))
                            .take(1000)
                            .then(members => new Set(members.map(member => member.organizationId))),
                        ctx.db
                            .query('member')
                            .withIndex('userId', q => q.eq('userId', normalizedTargetUserId))
                            .take(1000)
                            .then(members => new Set(members.map(member => member.organizationId))),
                    ]);

                    for (const targetOrganizationId of targetOrganizationIds) {
                        if (currentOrganizationIds.has(targetOrganizationId)) {
                            return true;
                        }
                    }

                    if (
                        (await pendingInvitationsForEmail()).some(
                            invitation => invitation.inviterId === normalizedTargetUserId
                        )
                    ) {
                        return true;
                    }
                }

                return user._id === userId;
            },
            insert: async () => false,
            modify: async () => isGlobalAdmin,
        },
        organization: {
            read: async (_, organization) => {
                if (isGlobalAdmin) return true;
                if (await isMemberOfOrganization(organization._id)) return true;

                const normalizedOrganizationId = ctx.db.normalizeId(
                    'organization',
                    organization._id
                );
                if (!normalizedOrganizationId) return false;

                return (await pendingInvitationsForEmail()).some(
                    invitation => invitation.organizationId === normalizedOrganizationId
                );
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
                    invitation.expiresAt > authorizationNow
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
