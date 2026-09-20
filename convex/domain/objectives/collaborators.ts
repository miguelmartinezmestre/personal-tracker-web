import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import {
    ERROR_CODES,
    OBJECTIVE_COLLABORATOR_ROLE,
    type ObjectiveCollaboratorRole,
} from '../../utils/constants';
import { isOrganizationAdminRole } from './permissions';

const SUCCESSOR_CANDIDATE_LIMIT = 100;

export async function getCollaboratorRoleForUser(
    ctx: { db: QueryCtx['db'] },
    objectiveId: Id<'objectives'>,
    userId: Id<'user'>
): Promise<ObjectiveCollaboratorRole | null> {
    const row = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective_user', q => q.eq('objectiveId', objectiveId).eq('userId', userId))
        .first();

    return row?.role ?? null;
}

export async function addObjectiveCollaborator(
    ctx: MutationCtx,
    args: {
        objective: Doc<'objectives'>;
        userId: Id<'user'>;
        role: ObjectiveCollaboratorRole;
        addedBy: Id<'user'>;
    }
): Promise<Id<'objectiveCollaborators'>> {
    if (args.userId === args.objective.ownerId) {
        throw new ConvexError(ERROR_CODES.COLLABORATOR_ALREADY_EXISTS);
    }

    const existing = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective_user', q =>
            q.eq('objectiveId', args.objective._id).eq('userId', args.userId)
        )
        .first();

    if (existing) {
        throw new ConvexError(ERROR_CODES.COLLABORATOR_ALREADY_EXISTS);
    }

    const membership = await ctx.db
        .query('member')
        .withIndex('by_organizationId_and_userId', q =>
            q.eq('organizationId', args.objective.organizationId).eq('userId', args.userId)
        )
        .first();

    if (!membership) {
        throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    return await ctx.db.insert('objectiveCollaborators', {
        objectiveId: args.objective._id,
        userId: args.userId,
        organizationId: args.objective.organizationId,
        role: args.role,
        addedBy: args.addedBy,
        createdAt: Date.now(),
    });
}

export async function updateObjectiveCollaboratorRole(
    ctx: MutationCtx,
    args: {
        collaboratorId: Id<'objectiveCollaborators'>;
        role: ObjectiveCollaboratorRole;
    }
) {
    const collaborator = await ctx.db.get('objectiveCollaborators', args.collaboratorId);
    if (!collaborator) {
        throw new ConvexError(ERROR_CODES.COLLABORATOR_NOT_FOUND);
    }

    await ctx.db.patch('objectiveCollaborators', args.collaboratorId, {
        role: args.role,
    });

    return await ctx.db.get('objectiveCollaborators', args.collaboratorId);
}

export async function removeObjectiveCollaborator(
    ctx: MutationCtx,
    collaboratorId: Id<'objectiveCollaborators'>
) {
    const collaborator = await ctx.db.get('objectiveCollaborators', collaboratorId);
    if (!collaborator) {
        throw new ConvexError(ERROR_CODES.COLLABORATOR_NOT_FOUND);
    }

    await ctx.db.delete('objectiveCollaborators', collaboratorId);
    return { success: true as const };
}

/**
 * Finds a user to take over an objective when its current owner leaves or is
 * deleted: the earliest editor collaborator, otherwise an org admin/owner.
 * Returns null when nobody in the organization can inherit it.
 */
export async function findObjectiveSuccessorOwner(
    ctx: { db: MutationCtx['db'] },
    objective: Pick<Doc<'objectives'>, '_id' | 'organizationId'>,
    excludeUserId: Id<'user'>
): Promise<Id<'user'> | null> {
    const editorCollaborators = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective_role_createdAt', q =>
            q.eq('objectiveId', objective._id).eq('role', OBJECTIVE_COLLABORATOR_ROLE.EDITOR)
        )
        .order('asc')
        .take(SUCCESSOR_CANDIDATE_LIMIT);

    for (const editor of editorCollaborators) {
        if (editor.userId === excludeUserId) {
            continue;
        }

        // Collaborator cleanup is asynchronous. A stale editor row can still
        // exist briefly after that user has left the organization, so never
        // promote it without re-validating the membership invariant.
        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', objective.organizationId).eq('userId', editor.userId)
            )
            .first();
        if (membership) {
            return editor.userId;
        }
    }

    const [owners, admins] = await Promise.all([
        ctx.db
            .query('member')
            .withIndex('by_organizationId_and_role_createdAt', q =>
                q.eq('organizationId', objective.organizationId).eq('role', 'owner')
            )
            .order('asc')
            .take(SUCCESSOR_CANDIDATE_LIMIT),
        ctx.db
            .query('member')
            .withIndex('by_organizationId_and_role_createdAt', q =>
                q.eq('organizationId', objective.organizationId).eq('role', 'admin')
            )
            .order('asc')
            .take(SUCCESSOR_CANDIDATE_LIMIT),
    ]);

    const adminCandidates = [...owners, ...admins]
        .filter(member => member.userId !== excludeUserId && isOrganizationAdminRole(member.role))
        .sort((left, right) => left.createdAt - right.createdAt);

    for (const admin of adminCandidates) {
        return admin.userId;
    }

    return null;
}

export async function reassignOwnedObjective(
    ctx: MutationCtx,
    objective: Pick<Doc<'objectives'>, '_id'>,
    nextOwnerId: Id<'user'>
) {
    await ctx.db.patch('objectives', objective._id, {
        ownerId: nextOwnerId,
        updatedAt: Date.now(),
    });

    // The promoted user no longer needs a separate collaborator row.
    const promotedCollaborator = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective_user', q =>
            q.eq('objectiveId', objective._id).eq('userId', nextOwnerId)
        )
        .first();
    if (promotedCollaborator) {
        await ctx.db.delete('objectiveCollaborators', promotedCollaborator._id);
    }
}
