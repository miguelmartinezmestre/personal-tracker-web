import type { Doc } from '../../_generated/dataModel';
import { rlsAllow, rlsDeny, rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

async function canReadRelatedUser(helpers: RlsHelpers, user: Doc<'user'>) {
    if (helpers.isGlobalAdmin || user._id === helpers.userId) {
        return true;
    }

    if (await helpers.isActiveOrganizationMember(user._id)) {
        return true;
    }

    for await (const membership of helpers.ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', user._id))) {
        if (await helpers.isMemberOfOrganization(membership.organizationId)) {
            return true;
        }
    }

    return (await helpers.pendingInvitationsForEmail()).some(
        invitation => invitation.inviterId === user._id
    );
}

export function organizationTableRules(helpers: RlsHelpers) {
    const {
        ctx,
        userId,
        email,
        authorizationNow,
        isGlobalAdmin,
        isActiveOrganization,
        hasActiveOrgAdminAccessToUser,
        isMemberOfOrganization,
        hasOrganizationAdminAccess,
        pendingInvitationsForEmail,
    } = helpers;

    return {
        member: {
            read: async (_ctx: QueryLike, member: Doc<'member'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                if (member.userId === userId) {
                    return true;
                }

                return await isMemberOfOrganization(member.organizationId);
            },
            insert: rlsDeny,
            modify: rlsDeny,
        },
        user: {
            read: (_ctx: QueryLike, user: Doc<'user'>) => canReadRelatedUser(helpers, user),
            insert: rlsDeny,
            modify: () => rlsWhen(isGlobalAdmin),
        },
        organization: {
            read: async (_ctx: QueryLike, organization: Doc<'organization'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                if (await isMemberOfOrganization(organization._id)) {
                    return true;
                }

                const normalizedOrganizationId = ctx.db.normalizeId(
                    'organization',
                    organization._id
                );

                if (!normalizedOrganizationId) {
                    return false;
                }

                return (await pendingInvitationsForEmail()).some(
                    invitation => invitation.organizationId === normalizedOrganizationId
                );
            },
            insert: rlsDeny,
            modify: rlsDeny,
        },
        invitation: {
            read: async (_ctx: QueryLike, invitation: Doc<'invitation'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                if (await hasOrganizationAdminAccess(invitation.organizationId)) {
                    return true;
                }

                return (
                    Boolean(email) &&
                    invitation.email === email &&
                    invitation.status === 'pending' &&
                    invitation.expiresAt > authorizationNow
                );
            },
            insert: rlsDeny,
            modify: async (_ctx: QueryLike, invitation: Doc<'invitation'>) => {
                return await hasOrganizationAdminAccess(invitation.organizationId);
            },
        },
        session: {
            read: async (_ctx: QueryLike, session: Doc<'session'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                const sessionUserId = ctx.db.normalizeId('user', session.userId);

                if (sessionUserId === userId) {
                    return true;
                }

                const sessionOrganizationId = session.activeOrganizationId
                    ? ctx.db.normalizeId('organization', session.activeOrganizationId)
                    : null;

                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
            insert: rlsDeny,
            modify: async (_ctx: QueryLike, session: Doc<'session'>) => {
                if (isGlobalAdmin) {
                    return true;
                }

                const sessionUserId = ctx.db.normalizeId('user', session.userId);

                if (sessionUserId === userId) {
                    return true;
                }

                const sessionOrganizationId = session.activeOrganizationId
                    ? ctx.db.normalizeId('organization', session.activeOrganizationId)
                    : null;

                return (
                    isActiveOrganization(sessionOrganizationId) &&
                    (await hasActiveOrgAdminAccessToUser(session.userId))
                );
            },
        },
        categories: {
            read: (_ctx: QueryLike, category: Doc<'categories'>) => {
                if (isGlobalAdmin) {
                    return rlsAllow();
                }

                if (category.userId === userId && isActiveOrganization(category.organizationId)) {
                    return rlsAllow();
                }

                return rlsWhen(isActiveOrganization(category.organizationId));
            },
            insert: (_ctx: QueryLike, category: RlsInsertDoc<'categories'>) => {
                if (isGlobalAdmin) {
                    return rlsAllow();
                }

                return rlsWhen(isActiveOrganization(category.organizationId));
            },
            modify: (_ctx: QueryLike, category: Doc<'categories'>) => {
                if (isGlobalAdmin) {
                    return rlsAllow();
                }

                return rlsWhen(
                    isActiveOrganization(category.organizationId) &&
                        (category.userId === userId ||
                            helpers.hasActiveOrgAdminAccess(category.organizationId))
                );
            },
        },
        objectives: {
            read: (_ctx: QueryLike, objective: Doc<'objectives'>) =>
                rlsWhen(isActiveOrganization(objective.organizationId)),
            insert: (_ctx: QueryLike, objective: RlsInsertDoc<'objectives'>) =>
                rlsWhen(isActiveOrganization(objective.organizationId)),
            modify: (_ctx: QueryLike, objective: Doc<'objectives'>) =>
                rlsWhen(isActiveOrganization(objective.organizationId)),
        },
        progressUpdates: {
            read: (_ctx: QueryLike, progressUpdate: Doc<'progressUpdates'>) =>
                rlsWhen(isActiveOrganization(progressUpdate.organizationId)),
            insert: (_ctx: QueryLike, progressUpdate: RlsInsertDoc<'progressUpdates'>) =>
                rlsWhen(isActiveOrganization(progressUpdate.organizationId)),
            modify: (_ctx: QueryLike, progressUpdate: Doc<'progressUpdates'>) =>
                rlsWhen(isActiveOrganization(progressUpdate.organizationId)),
        },
        platformSettings: {
            read: () => rlsWhen(isGlobalAdmin),
            insert: rlsDeny,
            modify: rlsDeny,
        },
    };
}
