import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { isGlobalAdminRole } from '../utils';

export type RlsInsertDoc<Table extends 'categories' | 'objectives' | 'progressUpdates'> = Omit<
    Doc<Table>,
    '_id' | '_creationTime'
>;

export function rlsDeny(): Promise<boolean> {
    return Promise.resolve(false);
}

export function rlsAllow(): Promise<boolean> {
    return Promise.resolve(true);
}

export function rlsWhen(allowed: boolean): Promise<boolean> {
    return Promise.resolve(allowed);
}

export type CreateRlsRulesArgs = {
    userId: Id<'user'>;
    role: string;
    memberRole: string | null;
    ctx: QueryCtx;
    organizationId?: Id<'organization'> | null;
    email?: string | null;
};

export type RlsHelpers = {
    userId: Id<'user'>;
    role: string;
    memberRole: string | null;
    ctx: QueryCtx;
    organizationId?: Id<'organization'> | null;
    email?: string | null;
    authorizationNow: number;
    isGlobalAdmin: boolean;
    isActiveOrganization: (targetOrganizationId?: Id<'organization'> | null) => boolean;
    hasActiveOrgAdminAccess: (targetOrganizationId?: Id<'organization'> | null) => boolean;
    isActiveOrganizationMember: (targetUserId: Id<'user'> | string) => Promise<boolean>;
    hasActiveOrgAdminAccessToUser: (targetUserId: Id<'user'> | string) => Promise<boolean>;
    isMemberOfOrganization: (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => Promise<boolean>;
    hasOrganizationAdminAccess: (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => Promise<boolean>;
    pendingInvitationsForEmail: () => Promise<
        Array<{ organizationId: Id<'organization'>; inviterId: Id<'user'> }>
    >;
};

export function createRlsHelpers(args: CreateRlsRulesArgs): RlsHelpers {
    const { userId, role, memberRole, ctx, organizationId, email } = args;
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
    const activeMemberCache = new Map<Id<'user'>, Promise<boolean>>();
    const isActiveOrganizationMember = async (targetUserId: Id<'user'> | string) => {
        const normalizedUserId = ctx.db.normalizeId('user', targetUserId);
        if (!organizationId || !normalizedUserId) {
            return false;
        }

        if (!activeMemberCache.has(normalizedUserId)) {
            activeMemberCache.set(
                normalizedUserId,
                ctx.db
                    .query('member')
                    .withIndex('by_organizationId_and_userId', q =>
                        q.eq('organizationId', organizationId).eq('userId', normalizedUserId)
                    )
                    .first()
                    .then(member => member !== null)
            );
        }
        return (await activeMemberCache.get(normalizedUserId)) ?? false;
    };
    const hasActiveOrgAdminAccessToUser = async (targetUserId: Id<'user'> | string) => {
        return isOrgAdmin && (await isActiveOrganizationMember(targetUserId));
    };
    const organizationRoleCache = new Map<Id<'organization'>, Promise<string | null>>();
    const membershipRoleForOrganization = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        let normalizedOrganizationId = null;
        if (targetOrganizationId) {
            normalizedOrganizationId = ctx.db.normalizeId('organization', targetOrganizationId);
        } else {
            normalizedOrganizationId = null;
        }
        if (!normalizedOrganizationId) {
            return null;
        }

        if (!organizationRoleCache.has(normalizedOrganizationId)) {
            organizationRoleCache.set(
                normalizedOrganizationId,
                (async () => {
                    if (!(await ctx.db.get('organization', normalizedOrganizationId))) {
                        return null;
                    }
                    return await ctx.db
                        .query('member')
                        .withIndex('by_organizationId_and_userId', q =>
                            q.eq('organizationId', normalizedOrganizationId).eq('userId', userId)
                        )
                        .first()
                        .then(member => member?.role ?? null);
                })()
            );
        }
        return (await organizationRoleCache.get(normalizedOrganizationId)) ?? null;
    };
    const isMemberOfOrganization = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        return (await membershipRoleForOrganization(targetOrganizationId)) !== null;
    };
    const hasOrganizationAdminAccess = async (
        targetOrganizationId?: Id<'organization'> | string | null
    ) => {
        if (isGlobalAdmin) {
            return true;
        }
        const targetRole = await membershipRoleForOrganization(targetOrganizationId);
        return targetRole === 'admin' || targetRole === 'owner';
    };
    const pendingInvitationsForEmail = async () => {
        if (!email) {
            return [];
        }
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

    return {
        userId,
        role,
        memberRole,
        ctx,
        organizationId,
        email,
        authorizationNow,
        isGlobalAdmin,
        isActiveOrganization,
        hasActiveOrgAdminAccess,
        isActiveOrganizationMember,
        hasActiveOrgAdminAccessToUser,
        isMemberOfOrganization,
        hasOrganizationAdminAccess,
        pendingInvitationsForEmail,
    };
}
