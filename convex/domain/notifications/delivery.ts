import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';

type NotificationAccessCtx = {
    db: DatabaseReader;
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

function isOrgAdminFor(ctx: NotificationAccessCtx, organizationId: Id<'organization'>) {
    return (
        (ctx.memberRole === 'admin' || ctx.memberRole === 'owner') &&
        ctx.organizationId !== null &&
        organizationId === ctx.organizationId
    );
}

export async function assertCanCreateNotificationForObjective(
    ctx: NotificationAccessCtx,
    objective: Doc<'objectives'>
) {
    const isGlobalAdmin = ctx.role === 'admin';
    const isOrganizationAdmin = isOrgAdminFor(ctx, objective.organizationId);
    const isOwner = objective.userId === ctx.userId;

    let isOrganizationMember = false;
    if (objective.scope === 'organization' && objective.organizationId === ctx.organizationId) {
        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', objective.organizationId).eq('userId', ctx.userId)
            )
            .first();
        isOrganizationMember = membership !== null;
    }

    if (!isGlobalAdmin && !isOrganizationAdmin && !isOwner && !isOrganizationMember) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
    }
}

export function assertCanMutateNotification(
    ctx: NotificationAccessCtx,
    notification: Doc<'notifications'>
) {
    const isGlobalAdmin = ctx.role === 'admin';
    const isOrganizationAdmin = isOrgAdminFor(ctx, notification.organizationId);
    const isOwner = notification.userId === ctx.userId;

    if (!isGlobalAdmin && !isOrganizationAdmin && !isOwner) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
    }
}

export function canReadObjectiveFromNotification(
    ctx: NotificationAccessCtx,
    objective: Doc<'objectives'>
) {
    const isVisiblePersonal = objective.scope === 'personal' && objective.userId === ctx.userId;
    const isVisibleOrganization =
        objective.scope === 'organization' &&
        ctx.organizationId !== null &&
        objective.organizationId === ctx.organizationId;
    const isGlobalAdmin = ctx.role === 'admin';
    const isOrganizationAdmin = isOrgAdminFor(ctx, objective.organizationId);

    return isGlobalAdmin || isOrganizationAdmin || isVisiblePersonal || isVisibleOrganization;
}
