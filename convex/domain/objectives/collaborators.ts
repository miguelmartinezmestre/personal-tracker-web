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
    const collaborators = await listCollaboratorsForObjective(ctx, objective._id);
    const editorCollaborators = collaborators
        .filter(
            collaborator =>
                collaborator.role === OBJECTIVE_COLLABORATOR_ROLE.EDITOR &&
                collaborator.userId !== excludeUserId
        )
        .sort((a, b) => a.createdAt - b.createdAt);

    if (editorCollaborators[0]) {
        return editorCollaborators[0].userId;
    }

    const members = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', objective.organizationId))
        .collect();

    const admin = members.find(
        member => member.userId !== excludeUserId && isOrganizationAdminRole(member.role)
    );

    return admin?.userId ?? null;
}

async function reassignOwnedObjective(
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
        const nextOwnerId = await findObjectiveSuccessorOwner(ctx, objective, departingUserId);
        if (!nextOwnerId) {
            continue;
        }
        await reassignOwnedObjective(ctx, objective, nextOwnerId);
    }
}

const CASCADE_BATCH_SIZE = 1000;

/**
 * Cleans up a user's data when their account is deleted so nothing is left
 * pointing at a non-existent user. Owned objectives are reassigned to a
 * successor across every organization; when none exists they are soft-deleted
 * (tombstoned) rather than left visible. The user's memberships, collaborator
 * rows, achievements, notification preferences and notifications are removed.
 */
export async function cascadeUserDeletion(ctx: MutationCtx, userId: Id<'user'>) {
    const now = Date.now();

    const organizationIds = new Set<Id<'organization'>>();

    let membershipCursor: string | null = null;
    let membershipsDone = false;
    while (!membershipsDone) {
        const page = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .paginate({ numItems: CASCADE_BATCH_SIZE, cursor: membershipCursor });

        for (const membership of page.page) {
            organizationIds.add(membership.organizationId);
        }

        membershipsDone = page.isDone;
        membershipCursor = page.continueCursor;
    }

    let objectiveCursor: string | null = null;
    let objectivesDone = false;
    while (!objectivesDone) {
        const page = await ctx.db
            .query('objectives')
            .withIndex('by_owner', q => q.eq('ownerId', userId))
            .paginate({ numItems: CASCADE_BATCH_SIZE, cursor: objectiveCursor });

        for (const objective of page.page) {
            organizationIds.add(objective.organizationId);
            if (objective.deletedAt !== undefined) {
                continue;
            }
            const nextOwnerId = await findObjectiveSuccessorOwner(ctx, objective, userId);
            if (nextOwnerId) {
                await reassignOwnedObjective(ctx, objective, nextOwnerId);
            } else {
                await ctx.db.patch('objectives', objective._id, {
                    deletedAt: now,
                    deletedBy: userId,
                    updatedAt: now,
                });
            }
        }

        objectivesDone = page.isDone;
        objectiveCursor = page.continueCursor;
    }

    let collaborations = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(CASCADE_BATCH_SIZE);
    while (collaborations.length > 0) {
        for (const collaboration of collaborations) {
            organizationIds.add(collaboration.organizationId);
            await ctx.db.delete('objectiveCollaborators', collaboration._id);
        }

        collaborations = await ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(CASCADE_BATCH_SIZE);
    }

    let achievements = await ctx.db
        .query('obtainedAchievements')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(CASCADE_BATCH_SIZE);
    while (achievements.length > 0) {
        for (const achievement of achievements) {
            await ctx.db.delete('obtainedAchievements', achievement._id);
        }

        achievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(CASCADE_BATCH_SIZE);
    }

    let preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(CASCADE_BATCH_SIZE);
    while (preferences.length > 0) {
        for (const preference of preferences) {
            await ctx.db.delete('notificationPreferences', preference._id);
        }

        preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(CASCADE_BATCH_SIZE);
    }

    for (const organizationId of organizationIds) {
        let notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_organization_date', q =>
                q.eq('userId', userId).eq('organizationId', organizationId)
            )
            .take(CASCADE_BATCH_SIZE);
        while (notifications.length > 0) {
            for (const notification of notifications) {
                await ctx.db.delete('notifications', notification._id);
            }

            notifications = await ctx.db
                .query('notifications')
                .withIndex('by_user_organization_date', q =>
                    q.eq('userId', userId).eq('organizationId', organizationId)
                )
                .take(CASCADE_BATCH_SIZE);
        }
    }

    let membershipsToDelete = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(CASCADE_BATCH_SIZE);
    while (membershipsToDelete.length > 0) {
        for (const membership of membershipsToDelete) {
            await ctx.db.delete('member', membership._id);
        }

        membershipsToDelete = await ctx.db
            .query('member')
            .withIndex('userId', q => q.eq('userId', userId))
            .take(CASCADE_BATCH_SIZE);
    }
}
