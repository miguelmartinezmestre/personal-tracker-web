import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { canObjective } from '../objectives/permissions';
import {
    collaboratorIds,
    objectiveAudiences,
    progressAggregate,
    progressNamespace,
    trackNamespace,
    writeObjectiveEntries,
} from './aggregates';
import { ensureDashboardState, queueProgressResync } from './migration';

const objectiveFields = [
    'status',
    'currentValue',
    'targetValue',
    'startValue',
    'ownerId',
    'visibility',
    'deletedAt',
    'deadline',
    'createdAt',
    'completedAt',
] as const;

export async function syncObjectiveEntries(
    ctx: MutationCtx,
    before: Doc<'objectives'> | null,
    after: Doc<'objectives'> | null
): Promise<void> {
    const objective = after ?? before;
    if (!objective) {
        return;
    }
    if (before && after && objectiveFields.every(field => before[field] === after[field])) {
        return;
    }
    const state = await ensureDashboardState(
        ctx,
        objective.organizationId,
        !before ? after?._id : undefined
    );
    if (!state) {
        return;
    }
    const readers = await collaboratorIds(ctx, objective._id);
    if (before) {
        await writeObjectiveEntries(
            ctx,
            before,
            state.generation,
            objectiveAudiences(before, readers),
            true
        );
    }
    if (after && (await ctx.db.get('organization', after.organizationId))) {
        await writeObjectiveEntries(
            ctx,
            after,
            state.generation,
            objectiveAudiences(after, readers),
            false
        );
    }
    if (
        before &&
        (!after ||
            before.visibility !== after.visibility ||
            before.ownerId !== after.ownerId ||
            before.deletedAt !== after.deletedAt)
    ) {
        await queueProgressResync(ctx, objective);
    }
}

export async function syncCollaboratorEntries(
    ctx: MutationCtx,
    before: Doc<'objectiveCollaborators'> | null,
    after: Doc<'objectiveCollaborators'> | null
): Promise<void> {
    const row = after ?? before;
    if (!row) {
        return;
    }
    const objective = await ctx.db.get('objectives', row.objectiveId);
    if (
        !objective ||
        objective.visibility === 'organization' ||
        objective.deletedAt !== undefined ||
        row.userId === objective.ownerId
    ) {
        return;
    }
    if (before && after && before.userId === after.userId) {
        return;
    }
    const state = await ensureDashboardState(ctx, objective.organizationId);
    if (!state) {
        return;
    }
    const currentReaders = await collaboratorIds(ctx, objective._id);
    const oldReaders = new Set(currentReaders);
    if (after) {
        oldReaders.delete(after.userId);
    }
    if (before) {
        oldReaders.add(before.userId);
    }
    await writeObjectiveEntries(
        ctx,
        objective,
        state.generation,
        objectiveAudiences(objective, [...oldReaders]),
        true
    );
    await writeObjectiveEntries(
        ctx,
        objective,
        state.generation,
        objectiveAudiences(objective, currentReaders),
        false
    );
    await queueProgressResync(ctx, objective);
}

async function canAuthorReadAsMember(
    ctx: MutationCtx,
    objective: Doc<'objectives'>,
    userId: Id<'user'>
): Promise<boolean> {
    const collaborator = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_objective_user', q =>
            q.eq('objectiveId', objective._id).eq('userId', userId)
        )
        .first();
    return canObjective(
        'view',
        {
            userId,
            isGlobalAdmin: false,
            isOrgAdmin: false,
            collaboratorRole: collaborator?.role ?? null,
        },
        objective
    );
}

export async function syncProgressEntries(
    ctx: MutationCtx,
    before: Doc<'progressUpdates'> | null,
    after: Doc<'progressUpdates'> | null,
    generationOverride?: number
): Promise<void> {
    const update = after ?? before;
    if (!update) {
        return;
    }
    const state = await ensureDashboardState(ctx, update.organizationId);
    const generation = generationOverride ?? state?.generation;
    if (generation === undefined) {
        return;
    }
    if (before) {
        for (const admin of [true, false]) {
            await progressAggregate.deleteIfExists(ctx, {
                namespace: progressNamespace(
                    before.organizationId,
                    generation,
                    before.createdBy,
                    admin
                ),
                key: before.updateDate,
                id: before._id,
            });
        }
    }
    if (!after) {
        return;
    }
    const objective = await ctx.db.get('objectives', after.objective);
    if (!objective || !(await ctx.db.get('organization', after.organizationId))) {
        return;
    }
    const memberCanRead = await canAuthorReadAsMember(ctx, objective, after.createdBy);
    for (const admin of [true, false]) {
        if (!admin && !memberCanRead) {
            continue;
        }
        const namespace = progressNamespace(
            after.organizationId,
            generation,
            after.createdBy,
            admin
        );
        await trackNamespace(ctx, after.organizationId, namespace, 'progress');
        await progressAggregate.insertIfDoesNotExist(ctx, {
            namespace,
            key: after.updateDate,
            id: after._id,
        });
    }
}
