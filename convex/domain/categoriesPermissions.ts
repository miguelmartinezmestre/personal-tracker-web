import type { Id } from '../_generated/dataModel';

export function categoryCapabilities(
    actor: {
        userId: Id<'user'>;
        organizationId: Id<'organization'> | null;
        role?: string;
        memberRole?: string | null;
    },
    category: { userId?: Id<'user'>; organizationId: Id<'organization'> }
) {
    const inOrganization = actor.organizationId === category.organizationId;
    const isAdmin =
        actor.role === 'globalAdmin' ||
        actor.memberRole === 'owner' ||
        actor.memberRole === 'admin';
    const canModify =
        actor.role === 'globalAdmin' ||
        (inOrganization && (category.userId === actor.userId || isAdmin));
    return { canEdit: canModify, canDelete: canModify };
}
