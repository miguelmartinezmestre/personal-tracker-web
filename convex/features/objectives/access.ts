import type { Infer } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { QueryCtx } from '../../_generated/server';
import { isOrganizationAdminRole } from '../organizations/roles';
import type { accessLevelValidator } from './validators';

export type AccessLevel = Infer<typeof accessLevelValidator>;

export type ObjectiveAccess = { canView: boolean; canEdit: boolean; canManage: boolean };

export type AccessActor = {
    userId: Id<'user'>;
    organizationId?: Id<'organization'> | null;
    memberRole?: string | null;
};

const NO_ACCESS: ObjectiveAccess = { canView: false, canEdit: false, canManage: false };

export function memberAccessLevel(objective: {
    memberCanView: boolean;
    memberCanEdit: boolean;
}): AccessLevel {
    if (objective.memberCanEdit) {
        return 'edit';
    }

    return objective.memberCanView ? 'view' : 'none';
}

// Granting edit grants view, and taking view away takes edit with it (decision 3).
export function memberAccessFields(level: AccessLevel) {
    return { memberCanView: level !== 'none', memberCanEdit: level === 'edit' };
}

/**
 * Owner, admins and the creator have full access to an objective of their organization; the
 * member role and individual users get what the objective grants them. The global admin role
 * gives nothing here (decision 1).
 */
export async function objectiveAccess(
    db: QueryCtx['db'],
    actor: AccessActor,
    objective: Doc<'objectives'>
): Promise<ObjectiveAccess> {
    if (objective.organizationId !== actor.organizationId) {
        return NO_ACCESS;
    }

    if (isOrganizationAdminRole(actor.memberRole) || objective.createdBy === actor.userId) {
        return { canView: true, canEdit: true, canManage: true };
    }

    if (objective.memberCanEdit) {
        return { canView: true, canEdit: true, canManage: false };
    }

    const grant = await db
        .query('objectivePermissions')
        .withIndex('by_objective_user', q =>
            q.eq('objectiveId', objective._id).eq('userId', actor.userId)
        )
        .unique();

    return {
        canView: objective.memberCanView || grant !== null,
        canEdit: grant?.canEdit ?? false,
        canManage: false,
    };
}

// The cheap part of `objectiveAccess`, for row-level reads that run on every listed objective.
export async function canViewObjective(
    db: QueryCtx['db'],
    actor: AccessActor,
    objective: Doc<'objectives'>
): Promise<boolean> {
    if (objective.organizationId !== actor.organizationId) {
        return false;
    }

    if (
        objective.memberCanView ||
        objective.createdBy === actor.userId ||
        isOrganizationAdminRole(actor.memberRole)
    ) {
        return true;
    }

    return (await objectiveAccess(db, actor, objective)).canView;
}
