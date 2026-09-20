import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';
import { shouldSendProgressNotification } from '../notifications/preferences';
import { ERROR_CODES } from '../../utils/constants';
import {
    normalizeUpdateDate,
    validateObjectiveNotCompleted,
    validateProgressDelta,
} from './metrics';
import { assertObjectiveAction, resolveObjectivePermissionSubject } from './access';
import { canEditProgress } from './permissions';
import { PROGRESS_COMMENT_MAX_LENGTH } from '../../../shared/input-constraints';
import { assertOptionalBoundedString } from '../../utils/inputValidation';

import { transitionObjective } from './transitions';
import { isOperationalMember } from '../organizations/operational';

const PROGRESS_SERIES_LIMIT = 500;

type ProgressMutationCtx = MutationCtx & {
    userId: Id<'user'>;
    organizationId: Id<'organization'> | null;
    role: string;
    memberRole: string | null;
};

async function assertCanEditProgressEntry(
    ctx: ProgressMutationCtx,
    progressUpdate: { createdBy: Id<'user'>; objective: Id<'objectives'> }
) {
    const objective = await ctx.db.get('objectives', progressUpdate.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    const subject = await resolveObjectivePermissionSubject(ctx, objective);
    if (
        !canEditProgress(subject, {
            authorId: progressUpdate.createdBy,
            ownerId: objective.ownerId,
        })
    ) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
    }
}

export async function createProgressUpdate(
    ctx: ProgressMutationCtx,
    args: {
        actingUserId: Id<'user'>;
        objective: Id<'objectives'>;
        updatedValue: number;
        updateDate: number;
        comment?: string;
    }
) {
    const objective = await ctx.db.get('objectives', args.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    if (objective.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    await assertObjectiveAction(ctx, objective, 'contributeProgress');

    const updateDate = normalizeUpdateDate(args.updateDate);
    validateProgressDelta(args.updatedValue, objective.currentValue);
    validateObjectiveNotCompleted(objective.status);
    assertOptionalBoundedString(args.comment, PROGRESS_COMMENT_MAX_LENGTH);

    const now = Date.now();
    const progressUpdateId = await ctx.db.insert('progressUpdates', {
        objective: args.objective,
        createdBy: args.actingUserId,
        organizationId: objective.organizationId,
        updatedValue: args.updatedValue,
        updateDate,
        comment: args.comment,
        createdAt: now,
        updatedAt: now,
    });

    await transitionObjective(ctx, objective._id, {
        actorUserId: args.actingUserId,
        progressAuthorId: args.actingUserId,
        delta: args.updatedValue,
    });

    const notifyProgress = await shouldSendProgressNotification(ctx, objective.ownerId);
    if (
        notifyProgress &&
        (await isOperationalMember(ctx, objective.organizationId, objective.ownerId))
    ) {
        await ctx.db.insert('notifications', {
            userId: objective.ownerId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: 'progress',
            messageKey: 'progressAdded',
            messageParams: {
                title: objective.title,
                amount: args.updatedValue,
                unit: objective.unit ?? '',
            },
            notificationDate: now,
            message: `Progress added to "${objective.title}": +${args.updatedValue}${
                objective.unit ? ` ${objective.unit}` : ''
            }`,
        });
    }

    return await ctx.db.get('progressUpdates', progressUpdateId);
}

export async function listProgressUpdatesByObjective(
    ctx: { db: DatabaseReader },
    args: {
        objectiveId: Id<'objectives'>;
        paginationOpts: PaginationOptions;
    }
) {
    const results = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
        .order('desc')
        .paginate(args.paginationOpts);

    return results;
}

export async function getProgressSeriesByObjective(
    ctx: { db: DatabaseReader },
    args: { objectiveId: Id<'objectives'> }
) {
    const results = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', args.objectiveId))
        .order('desc')
        .take(PROGRESS_SERIES_LIMIT + 1);

    const isTruncated = results.length > PROGRESS_SERIES_LIMIT;
    const points = results.slice(0, PROGRESS_SERIES_LIMIT).reverse();

    const objective = await ctx.db.get('objectives', args.objectiveId);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }
    const seriesStartValue =
        objective.currentValue - points.reduce((sum, point) => sum + point.updatedValue, 0);
    return { points, isTruncated, seriesStartValue };
}

export async function updateProgressUpdate(
    ctx: ProgressMutationCtx,
    args: {
        id: Id<'progressUpdates'>;
        updatedValue: number;
        updateDate: number;
        comment?: string;
    }
) {
    const existing = await ctx.db.get('progressUpdates', args.id);
    if (!existing) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await assertCanEditProgressEntry(ctx, existing);

    const objective = await ctx.db.get('objectives', existing.objective);
    if (!objective) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    if (objective.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);
    }

    const updateDate = normalizeUpdateDate(args.updateDate);
    assertOptionalBoundedString(args.comment, PROGRESS_COMMENT_MAX_LENGTH);
    // Validate against the true resulting value: the objective's current value
    // without this entry's previous contribution, plus its new contribution.
    // (Editing/deleting a past entry is allowed even once the objective is
    // completed — the delta may legitimately re-open it — so unlike
    // creating a new entry there is no "already completed" guard here.)
    validateProgressDelta(args.updatedValue, objective.currentValue - existing.updatedValue);

    await ctx.db.patch('progressUpdates', args.id, {
        updatedValue: args.updatedValue,
        updateDate,
        comment: args.comment,
        updatedAt: Date.now(),
    });

    await transitionObjective(ctx, objective._id, {
        actorUserId: ctx.userId,
        progressAuthorId: existing.createdBy,
        delta: args.updatedValue - existing.updatedValue,
    });

    return await ctx.db.get('progressUpdates', args.id);
}

export async function deleteProgressUpdate(
    ctx: ProgressMutationCtx,
    args: { id: Id<'progressUpdates'> }
) {
    const existing = await ctx.db.get('progressUpdates', args.id);
    if (!existing) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await assertCanEditProgressEntry(ctx, existing);

    const objective = await ctx.db.get('objectives', existing.objective);
    if (!objective) {
        await ctx.db.delete('progressUpdates', args.id);
        return { success: true } as const;
    }
    if (objective.deletedAt !== undefined) {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_DELETED);
    }

    await ctx.db.delete('progressUpdates', args.id);
    await transitionObjective(ctx, objective._id, {
        actorUserId: ctx.userId,
        progressAuthorId: existing.createdBy,
        delta: -existing.updatedValue,
    });

    return { success: true } as const;
}
