import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import {
    ERROR_CODES,
    OBJECTIVE_COLLABORATOR_ROLE,
    type ObjectiveCollaboratorRole,
} from '../../utils/constants';
import { isOrganizationAdminRole } from './permissions';

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

export async function getCollaboratedObjectiveIdsForUser(
    ctx: { db: QueryCtx['db'] },
    userId: Id<'user'>,
    organizationId: Id<'organization'>
): Promise<Set<Id<'objectives'>>> {
    const rows = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_user_organization', q =>
            q.eq('userId', userId).eq('organizationId', organizationId)
        )
        .collect();

    return new Set(rows.map(row => row.objectiveId));
}

export async function listCollaboratorsForObjective(
    ctx: { db: QueryCtx['db'] },
    objectiveId: Id<'objectives'>
) {
    return await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective', q => q.eq('objectiveId', objectiveId))
        .collect();
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

export async function reassignObjectivesOnMemberLeave(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    departingUserId: Id<'user'>
) {
    const collaboratorRows = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_user_organization', q =>
            q.eq('userId', departingUserId).eq('organizationId', organizationId)
        )
        .collect();

    for (const collaborator of collaboratorRows) {
        await ctx.db.delete('objectiveCollaborators', collaborator._id);
    }

    const ownedObjectives = await ctx.db
        .query('objectives')
        .withIndex('by_owner', q => q.eq('ownerId', departingUserId))
        .collect();

    const objectivesToReassign = ownedObjectives.filter(
        objective =>
            objective.organizationId === organizationId && objective.deletedAt === undefined
    );

    for (const objective of objectivesToReassign) {
        const collaborators = await listCollaboratorsForObjective(ctx, objective._id);
        const editorCollaborators = collaborators
            .filter(collaborator => collaborator.role === OBJECTIVE_COLLABORATOR_ROLE.EDITOR)
            .sort((a, b) => a.createdAt - b.createdAt);

        const nextOwnerId =
            editorCollaborators[0]?.userId ??
            (await (async (): Promise<Id<'user'> | null> => {
                const members = await ctx.db
                    .query('member')
                    .withIndex('organizationId', q => q.eq('organizationId', organizationId))
                    .collect();

                const admin = members.find(
                    member =>
                        member.userId !== departingUserId && isOrganizationAdminRole(member.role)
                );

                return admin?.userId ?? null;
            })());

        if (!nextOwnerId) {
            continue;
        }

        await ctx.db.patch('objectives', objective._id, {
            ownerId: nextOwnerId,
            updatedAt: Date.now(),
        });

        const promotedCollaborator = editorCollaborators.find(
            collaborator => collaborator.userId === nextOwnerId
        );
        if (promotedCollaborator) {
            await ctx.db.delete('objectiveCollaborators', promotedCollaborator._id);
        }
    }
}
