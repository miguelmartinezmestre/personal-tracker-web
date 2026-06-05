import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
import { ERROR_CODES } from '../../utils/constants';
import { isGlobalAdminRole } from '../../../shared/platform-roles';

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

export function assertCanMutateNotification(
    ctx: NotificationAccessCtx,
    notification: Doc<'notifications'>
) {
    const isGlobalAdmin = isGlobalAdminRole(ctx.role);
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
    const isVisibleOrganization =
        ctx.organizationId !== null && objective.organizationId === ctx.organizationId;
    const isGlobalAdmin = isGlobalAdminRole(ctx.role);
    const isOrganizationAdmin = isOrgAdminFor(ctx, objective.organizationId);

    return isGlobalAdmin || isOrganizationAdmin || isVisibleOrganization;
}
