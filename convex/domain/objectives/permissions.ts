import type { Id } from '../../_generated/dataModel';
import type { ObjectiveCollaboratorRole, ObjectiveVisibility } from '../../utils/constants';
import { isOrganizationAdminRole } from '../../../shared/organization-roles';

export { isOrganizationAdminRole };

export type ObjectiveAction =
    | 'view'
    | 'editDefinition'
    | 'delete'
    | 'purge'
    | 'restore'
    | 'manageCollaborators'
    | 'setVisibility'
    | 'transferOwnership'
    | 'contributeProgress';

export type PermissionSubject = {
    userId: Id<'user'>;
    isGlobalAdmin: boolean;
    isOrgAdmin: boolean;
    collaboratorRole: ObjectiveCollaboratorRole | null;
};

export type ObjectivePermissionResource = {
    ownerId: Id<'user'>;
    visibility: ObjectiveVisibility;
    deletedAt?: number;
};

export function canObjective(
    action: ObjectiveAction,
    subject: PermissionSubject,
    objective: ObjectivePermissionResource
): boolean {
    const isOwner = objective.ownerId === subject.userId;
    const isDeleted = objective.deletedAt !== undefined;

    if (isDeleted) {
        if (action !== 'view' && action !== 'restore' && action !== 'purge') {
            return false;
        }
        return subject.isGlobalAdmin || subject.isOrgAdmin || isOwner;
    }

    if (action === 'restore' || action === 'purge') {
        return false;
    }

    if (subject.isGlobalAdmin || subject.isOrgAdmin) {
        return true;
    }

    if (isOwner) {
        return true;
    }

    switch (action) {
        case 'view':
            if (subject.collaboratorRole !== null) {
                return true;
            }
            return objective.visibility === 'organization';
        case 'contributeProgress':
            return subject.collaboratorRole === 'editor';
        case 'editDefinition':
        case 'delete':
        case 'manageCollaborators':
        case 'setVisibility':
        case 'transferOwnership':
            return false;
    }
}

export function canEditProgress(
    subject: PermissionSubject,
    progress: { authorId: Id<'user'>; ownerId: Id<'user'> }
): boolean {
    if (subject.isGlobalAdmin || subject.isOrgAdmin) {
        return true;
    }
    if (progress.authorId === subject.userId) {
        return true;
    }
    return progress.ownerId === subject.userId;
}

export type ObjectiveCapabilities = {
    canView: boolean;
    canEditDefinition: boolean;
    canDelete: boolean;
    canRestore: boolean;
    canPurge: boolean;
    canManageCollaborators: boolean;
    canContribute: boolean;
    canSetVisibility: boolean;
    canTransfer: boolean;
};

export function buildObjectiveCapabilities(
    subject: PermissionSubject,
    objective: ObjectivePermissionResource
): ObjectiveCapabilities {
    return {
        canView: canObjective('view', subject, objective),
        canEditDefinition: canObjective('editDefinition', subject, objective),
        canDelete: canObjective('delete', subject, objective),
        canRestore: canObjective('restore', subject, objective),
        canPurge: canObjective('purge', subject, objective),
        canManageCollaborators: canObjective('manageCollaborators', subject, objective),
        canContribute: canObjective('contributeProgress', subject, objective),
        canSetVisibility: canObjective('setVisibility', subject, objective),
        canTransfer: canObjective('transferOwnership', subject, objective),
    };
}

export function buildPermissionSubject(args: {
    userId: Id<'user'>;
    platformRole: string;
    memberRole: string | null;
    collaboratorRole: ObjectiveCollaboratorRole | null;
}): PermissionSubject {
    return {
        userId: args.userId,
        isGlobalAdmin: args.platformRole === 'globalAdmin',
        isOrgAdmin: isOrganizationAdminRole(args.memberRole),
        collaboratorRole: args.collaboratorRole,
    };
}
