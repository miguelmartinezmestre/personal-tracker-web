import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

const BATCH_SIZE = 50;

type DeleteObjectivePhase = 'collaborators' | 'progress' | 'notifications';

type DeleteObjectiveContinueArgs = {
    objectiveId: Id<'objectives'>;
    purgeToken: string;
    phase?: DeleteObjectivePhase;
    cursor?: string | null;
    totalProgressDeleted?: number;
    totalNotificationsDeleted?: number;
};

export async function continueObjectiveDeletion(
    ctx: MutationCtx,
    args: DeleteObjectiveContinueArgs
) {
    const phase = args.phase ?? 'collaborators';
    const totalProgressDeleted = args.totalProgressDeleted ?? 0;
    const totalNotificationsDeleted = args.totalNotificationsDeleted ?? 0;
    const objective = await ctx.db.get(args.objectiveId);

    if (!objective) {
        return {
            status: 'completed',
            noOp: true,
            deleted: {
                progress: totalProgressDeleted,
                notifications: totalNotificationsDeleted,
            },
        };
    }

    if (objective.purgeToken !== args.purgeToken || objective.deletedAt === undefined) {
        return {
            status: 'cancelled',
            noOp: true,
            deleted: {
                progress: totalProgressDeleted,
                notifications: totalNotificationsDeleted,
            },
        };
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
            cursor: null,
            totalProgressDeleted,
            totalNotificationsDeleted,
        });

        return {
            status: 'in_progress',
            phase: nextPhase,
            deleted: {
                progress: totalProgressDeleted,
                notifications: totalNotificationsDeleted,
            },
        };
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
            await ctx.db.delete(update._id);
        }

        const newTotalProgress = totalProgressDeleted + page.page.length;

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
                objectiveId: args.objectiveId,
                purgeToken: args.purgeToken,
                phase: 'progress',
                cursor: null,
                totalProgressDeleted: newTotalProgress,
                totalNotificationsDeleted,
            });
            return {
                status: 'in_progress',
                phase: 'progress',
                deleted: {
                    progress: newTotalProgress,
                    notifications: totalNotificationsDeleted,
                },
            };
        }

        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'notifications',
            cursor: null,
            totalProgressDeleted: newTotalProgress,
            totalNotificationsDeleted,
        });
        return {
            status: 'in_progress',
            phase: 'notifications',
            deleted: { progress: newTotalProgress, notifications: totalNotificationsDeleted },
        };
    }

    const page = await ctx.db
        .query('notifications')
        .withIndex('by_objective_type_date', q => q.eq('objective', args.objectiveId))
        .paginate({
            numItems: BATCH_SIZE,
            cursor: null,
        });

    for (const notification of page.page) {
        await ctx.db.delete(notification._id);
    }

    const newTotalNotifications = totalNotificationsDeleted + page.page.length;

    if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.objectives.deleteObjectiveContinue, {
            objectiveId: args.objectiveId,
            purgeToken: args.purgeToken,
            phase: 'notifications',
            cursor: null,
            totalProgressDeleted,
            totalNotificationsDeleted: newTotalNotifications,
        });
        return {
            status: 'in_progress',
            phase: 'notifications',
            deleted: {
                progress: totalProgressDeleted,
                notifications: newTotalNotifications,
            },
        };
    }

    await ctx.db.delete(args.objectiveId);

    return {
        status: 'completed',
        deleted: { progress: totalProgressDeleted, notifications: newTotalNotifications },
    };
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
            cursor: null,
            totalProgressDeleted: 0,
            totalNotificationsDeleted: 0,
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
            cursor: null,
            totalProgressDeleted: 0,
            totalNotificationsDeleted: 0,
        });

        return { status: 'deletion_started', objectiveId: args.objectiveId };
    }

    for (const update of progressBatch) {
        await ctx.db.delete(update._id);
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
            cursor: null,
            totalProgressDeleted: progressBatch.length,
            totalNotificationsDeleted: 0,
        });

        return { status: 'deletion_started', objectiveId: args.objectiveId };
    }

    for (const notification of notificationsBatch) {
        await ctx.db.delete(notification._id);
    }

    await ctx.db.delete('objectives', args.objectiveId);

    return {
        status: 'deleted',
        objectiveId: args.objectiveId,
        deleted: {
            progress: progressBatch.length,
            notifications: notificationsBatch.length,
        },
    };
}
