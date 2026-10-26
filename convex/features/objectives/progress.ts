import type { Change } from 'convex-helpers/server/triggers';
import { ConvexError } from 'convex/values';
import { internal } from '../../_generated/api';
import type { DataModel, Doc, Id } from '../../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../../_generated/server';
import { ERROR_CODES } from '../../shared/errorCodes';
import { RESULTING_VALUES_BATCH_SIZE } from './constants';
import { measurement, requireObjective, requireOrganizationId, roundStoredValue } from './records';
import type { AccessActor } from './access';

export type ProgressPosition = { updateDate: number; creationTime: number };

export const positionOf = (entry: Doc<'progressUpdates'>): ProgressPosition => ({
    updateDate: entry.updateDate,
    creationTime: entry._creationTime,
});

export async function applyDifference(
    ctx: MutationCtx,
    objective: Doc<'objectives'>,
    difference: number,
    now: number
) {
    await ctx.db.patch('objectives', objective._id, {
        ...measurement(objective, roundStoredValue(objective.currentValue + difference), now),
        updatedAt: now,
    });
}

export async function requireEditableEntry(
    ctx: MutationCtx & AccessActor,
    id: Id<'progressUpdates'>
) {
    const organizationId = requireOrganizationId(ctx.organizationId);
    const entry = await ctx.db.get('progressUpdates', id);

    if (!entry || entry.organizationId !== organizationId) {
        throw new ConvexError(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    const { objective, access } = await requireObjective(ctx.db, ctx, entry.objective);

    if (!access.canEdit) {
        throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_PROGRESS);
    }

    if (objective.status === 'completed') {
        throw new ConvexError(ERROR_CODES.OBJECTIVE_ALREADY_COMPLETED);
    }

    return { entry, objective };
}

async function valueBefore(
    db: DatabaseReader,
    objective: Doc<'objectives'>,
    from: ProgressPosition | null
) {
    if (!from) {
        return objective.startValue;
    }

    const sameDay = await db
        .query('progressUpdates')
        .withIndex('by_objective_date', q =>
            q
                .eq('objective', objective._id)
                .eq('updateDate', from.updateDate)
                .lt('_creationTime', from.creationTime)
        )
        .order('desc')
        .first();

    const previous =
        sameDay ??
        (await db
            .query('progressUpdates')
            .withIndex('by_objective_date', q =>
                q.eq('objective', objective._id).lt('updateDate', from.updateDate)
            )
            .order('desc')
            .first());

    return previous?.resultingValue ?? objective.startValue;
}

async function entriesFrom(
    db: DatabaseReader,
    objectiveId: Id<'objectives'>,
    from: ProgressPosition | null,
    limit: number
) {
    if (!from) {
        return await db
            .query('progressUpdates')
            .withIndex('by_objective_date', q => q.eq('objective', objectiveId))
            .take(limit);
    }

    const sameDay = await db
        .query('progressUpdates')
        .withIndex('by_objective_date', q =>
            q
                .eq('objective', objectiveId)
                .eq('updateDate', from.updateDate)
                .gte('_creationTime', from.creationTime)
        )
        .take(limit);

    if (sameDay.length === limit) {
        return sameDay;
    }

    const later = await db
        .query('progressUpdates')
        .withIndex('by_objective_date', q =>
            q.eq('objective', objectiveId).gt('updateDate', from.updateDate)
        )
        .take(limit - sameDay.length);

    return [...sameDay, ...later];
}

// shortcut: two overlapping background runs on one objective can leave stale values; add a per-objective lock if that shows up.
export async function recalculateResultingValues(
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    from: ProgressPosition | null
) {
    const objective = await ctx.db.get('objectives', objectiveId);

    if (!objective) {
        return;
    }

    let value = await valueBefore(ctx.db, objective, from);
    const entries = await entriesFrom(ctx.db, objectiveId, from, RESULTING_VALUES_BATCH_SIZE + 1);

    for (const entry of entries.slice(0, RESULTING_VALUES_BATCH_SIZE)) {
        value = roundStoredValue(value + entry.updatedValue);

        if (entry.resultingValue !== value) {
            await ctx.db.patch('progressUpdates', entry._id, { resultingValue: value });
        }
    }

    const next = entries.at(RESULTING_VALUES_BATCH_SIZE);

    if (next) {
        await ctx.scheduler.runAfter(0, internal.progress.continueResultingValues, {
            objectiveId,
            ...positionOf(next),
        });
    }
}

// Recalculated values leave `updatedAt` alone: they are not an edit to audit or reward.
export const isResultingValueRecalculation = (change: Change<DataModel, 'progressUpdates'>) =>
    change.operation === 'update' && change.oldDoc.updatedAt === change.newDoc.updatedAt;
