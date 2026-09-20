import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

const BATCH_SIZE = 50;

type DeleteObjectivePhase = 'collaborators' | 'progress' | 'notifications';

type DeleteObjectiveContinueArgs = {
    objectiveId: Id<'objectives'>;
    purgeToken: string;
    phase?: DeleteObjectivePhase;
};

export async function continueObjectiveDeletion(
    ctx: MutationCtx,
    args: DeleteObjectiveContinueArgs
): Promise<null> {
    const phase = args.phase ?? 'collaborators';
    const objective = await ctx.db.get('objectives', args.objectiveId);

    if (!objective) {
        return null;
    }

    if (objective.purgeToken !== args.purgeToken || objective.deletedAt === undefined) {
        return null;
    }

    if (phase === 'collaborators') {
        const collaborators = await ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_objective', q => q.eq('objectiveId', args.objectiveId))
            .take(BATCH_SIZE);

        for (const collaborator of collaborators) {
            await ctx.db.delete('objectiveCollaborators', collaborator._id);
        }

        const nextPhase = collaborators.length === BATCH_SIZE ? 'collaborators' : 'progress';
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: nextPhase,
        });

        return null;
    }

    if (phase === 'progress') {
        const page = await ctx.db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
            .paginate({
                numItems: BATCH_SIZE,
                cursor: null,
            });

        for (const update of page.page) {
            await ctx.db.delete('progressUpdates', update._id);
        }

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                objectiveId: args.objectiveId,
                purgeToken: args.purgeToken,
                phase: 'progress',
            });
            return null;
        }

        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'notifications',
        });
        return null;
    }

    const page = await ctx.db
        .query('notifications')
        .withIndex('by_objective_type_date', q => q.eq('objective', args.objectiveId))
        .paginate({
            numItems: BATCH_SIZE,
            cursor: null,
        });

    for (const notification of page.page) {
        await ctx.db.delete('notifications', notification._id);
    }

    if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'notifications',
        });
        return null;
    }

    await ctx.db.delete('objectives', args.objectiveId);

    return null;
}

export async function deleteObjectiveWithDependents(
    ctx: MutationCtx,
    args: { objectiveId: Id<'objectives'>; purgeToken: string }
) {
    const objective = await ctx.db.get('objectives', args.objectiveId);
    if (
        !objective ||
        objective.deletedAt === undefined ||
        objective.purgeToken !== args.purgeToken
    ) {
        return { status: 'cancelled', objectiveId: args.objectiveId };
    }

    const collaboratorsBatch = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective', q => q.eq('objectiveId', args.objectiveId))
        .take(BATCH_SIZE + 1);

    if (collaboratorsBatch.length > BATCH_SIZE) {
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'collaborators',
        });

        return { status: 'deletion_started', objectiveId: args.objectiveId };
    }

    for (const collaborator of collaboratorsBatch) {
        await ctx.db.delete('objectiveCollaborators', collaborator._id);
    }

    const progressBatch = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
        .take(BATCH_SIZE + 1);

    if (progressBatch.length > BATCH_SIZE) {
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'progress',
        });

        return { status: 'deletion_started', objectiveId: args.objectiveId };
    }

    for (const update of progressBatch) {
        await ctx.db.delete('progressUpdates', update._id);
    }

    const notificationsBatch = await ctx.db
        .query('notifications')
        .withIndex('by_objective_type_date', q => q.eq('objective', args.objectiveId))
        .take(BATCH_SIZE + 1);

    if (notificationsBatch.length > BATCH_SIZE) {
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'notifications',
        });

        return { status: 'deletion_started', objectiveId: args.objectiveId };
    }

    for (const notification of notificationsBatch) {
        await ctx.db.delete('notifications', notification._id);
    }

    await ctx.db.delete('objectives', args.objectiveId);

    return {
        status: 'deleted',
        objectiveId: args.objectiveId,
    };
}
