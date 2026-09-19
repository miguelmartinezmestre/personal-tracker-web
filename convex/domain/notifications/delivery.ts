import type { Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader } from '../../_generated/server';
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
