import type { Doc, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { isGlobalAdminRole } from '../auth/roles';
import { getMembershipRole } from '../auth/authRecords';

export type RlsInsertDoc<
    Table extends
        | 'categories'
        | 'objectives'
        | 'objectivePermissions'
        | 'progressUpdates'
        | 'notificationPreferences',
> = Omit<Doc<Table>, '_id' | '_creationTime'>;

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
    isGlobalAdmin: boolean;
    isActiveOrganization: (targetOrganizationId?: Id<'organization'> | null) => boolean;
    hasActiveOrgAdminAccess: (targetOrganizationId?: Id<'organization'> | null) => boolean;
    isMemberOfOrganization: (targetOrganizationId?: string | null) => Promise<boolean>;
};

export function createRlsHelpers(args: CreateRlsRulesArgs): RlsHelpers {
    const { userId, role, memberRole, ctx, organizationId } = args;
    const isGlobalAdmin = isGlobalAdminRole(role);

    const isOrgAdmin =
        Boolean(organizationId) && (memberRole === 'admin' || memberRole === 'owner');

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

    const organizationRoleCache = new Map<string, Promise<string | null>>();

    const isMemberOfOrganization = async (targetOrganizationId?: string | null) => {
        if (!targetOrganizationId) {
            return false;
        }

        if (!organizationRoleCache.has(targetOrganizationId)) {
            organizationRoleCache.set(
                targetOrganizationId,
                getMembershipRole(ctx, targetOrganizationId, userId)
            );
        }

        return (await organizationRoleCache.get(targetOrganizationId)) != null;
    };

    return {
        userId,
        role,
        memberRole,
        ctx,
        organizationId,
        isGlobalAdmin,
        isActiveOrganization,
        hasActiveOrgAdminAccess,
        isMemberOfOrganization,
    };
}
