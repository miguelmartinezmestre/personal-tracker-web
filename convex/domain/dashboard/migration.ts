import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
    collaboratorIds,
    objectiveAudiences,
    writeObjectiveEntries,
    objectiveAggregate,
    progressAggregate,
} from './aggregates';
import { syncProgressEntries } from './sync';

export async function ensureDashboardState(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<Doc<'dashboardMigrations'> | null> {
    const existing = await ctx.db
        .query('dashboardMigrations')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .first();
    if (existing) {
        return existing;
    }
    if (!(await ctx.db.get('organization', organizationId))) {
        return null;
    }
    const id = await ctx.db.insert('dashboardMigrations', {
        organizationId,
        generation: 1,
        phase: 'ready',
    });
    return await ctx.db.get('dashboardMigrations', id);
}

export async function startDashboardRebuild(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<Id<'dashboardMigrations'> | null> {
    if (!(await ctx.db.get('organization', organizationId))) {
        return null;
    }
    const existing = await ctx.db
        .query('dashboardMigrations')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .first();
    const generation = (existing?.generation ?? 0) + 1;
    const values = {
        organizationId,
        generation,
        phase: 'objectives' as const,
        cursor: null,
    };
    const migrationId = existing?._id ?? (await ctx.db.insert('dashboardMigrations', values));
    if (existing) {
        await ctx.db.patch('dashboardMigrations', migrationId, values);
    }
    await ctx.scheduler.runAfter(0, internal.dashboard.runDashboardBackfill, {
        migrationId,
        generation,
    });
    return migrationId;
}

export async function runDashboardBackfillBatch(
    ctx: MutationCtx,
    args: { migrationId: Id<'dashboardMigrations'>; generation: number }
): Promise<null> {
    const state = await ctx.db.get('dashboardMigrations', args.migrationId);
    if (!state || state.generation !== args.generation || state.phase === 'ready') {
        return null;
    }
    if (!(await ctx.db.get('organization', state.organizationId))) {
        await ctx.db.delete('dashboardMigrations', state._id);
        return null;
    }
    if (state.phase === 'objectives') {
        const page = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', state.organizationId))
            .paginate({ cursor: state.cursor ?? null, numItems: 10 });
        for (const objective of page.page) {
            const readers = await collaboratorIds(ctx, objective._id);
            await writeObjectiveEntries(
                ctx,
                objective,
                state.generation,
                objectiveAudiences(objective, readers),
                false
            );
        }
        await ctx.db.patch('dashboardMigrations', state._id, {
            phase: page.isDone ? 'progress' : 'objectives',
            cursor: page.isDone ? null : page.continueCursor,
        });
    } else {
        const page = await ctx.db
            .query('progressUpdates')
            .withIndex('by_organization_date', q => q.eq('organizationId', state.organizationId))
            .paginate({ cursor: state.cursor ?? null, numItems: 50 });
        for (const update of page.page) {
            await syncProgressEntries(ctx, null, update, state.generation);
        }
        await ctx.db.patch('dashboardMigrations', state._id, {
            phase: page.isDone ? 'ready' : 'progress',
            cursor: page.isDone ? null : page.continueCursor,
        });
        if (page.isDone) {
            await ctx.scheduler.runAfter(0, internal.dashboard.cleanupDashboardGenerations, {
                organizationId: state.organizationId,
            });
            return null;
        }
    }
    await ctx.scheduler.runAfter(0, internal.dashboard.runDashboardBackfill, args);
    return null;
}

export async function cleanupDashboardGenerationsBatch(
    ctx: MutationCtx,
    args: { organizationId: Id<'organization'>; cursor?: string | null }
): Promise<null> {
    const state = await ctx.db
        .query('dashboardMigrations')
        .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
        .first();
    if (!state || state.phase !== 'ready') {
        return null;
    }
    const page = await ctx.db
        .query('dashboardNamespaces')
        .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
        .paginate({ cursor: args.cursor ?? null, numItems: 10 });
    for (const entry of page.page) {
        const generation = Number(entry.namespace.split('/')[1]);
        if (!Number.isSafeInteger(generation) || generation < 1 || generation >= state.generation) {
            continue;
        }
        const aggregate = entry.kind === 'objectives' ? objectiveAggregate : progressAggregate;
        await aggregate.clear(ctx, { namespace: entry.namespace });
        await ctx.db.delete('dashboardNamespaces', entry._id);
    }
    if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.dashboard.cleanupDashboardGenerations, {
            ...args,
            cursor: page.continueCursor,
        });
    }
    return null;
}

export async function queueProgressResync(
    ctx: MutationCtx,
    objective: Doc<'objectives'>
): Promise<void> {
    const first = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', objective._id))
        .first();
    if (!first) {
        return;
    }
    const existing = await ctx.db
        .query('dashboardResyncs')
        .withIndex('by_objective', q => q.eq('objectiveId', objective._id))
        .first();
    const revision = (existing?.revision ?? 0) + 1;
    const data = {
        objectiveId: objective._id,
        organizationId: objective.organizationId,
        revision,
        pending: true,
    };
    const resyncId = existing?._id ?? (await ctx.db.insert('dashboardResyncs', data));
    if (existing) {
        await ctx.db.patch('dashboardResyncs', resyncId, data);
    }
    await ctx.scheduler.runAfter(0, internal.dashboard.resyncObjectiveProgress, {
        resyncId,
        revision,
    });
}

export async function resyncProgressBatch(
    ctx: MutationCtx,
    args: { resyncId: Id<'dashboardResyncs'>; revision: number; cursor?: string | null }
): Promise<null> {
    const state = await ctx.db.get('dashboardResyncs', args.resyncId);
    if (!state || !state.pending || state.revision !== args.revision) {
        return null;
    }
    const migration = await ctx.db
        .query('dashboardMigrations')
        .withIndex('by_organization', q => q.eq('organizationId', state.organizationId))
        .first();
    if (!migration) {
        await ctx.db.delete('dashboardResyncs', state._id);
        return null;
    }
    const page = await ctx.db
        .query('progressUpdates')
        .withIndex('by_objective_date', q => q.eq('objective', state.objectiveId))
        .paginate({ numItems: 50, cursor: args.cursor ?? null });
    for (const update of page.page) {
        await syncProgressEntries(ctx, update, update, migration.generation);
    }
    if (page.isDone) {
        await ctx.db.patch('dashboardResyncs', state._id, { pending: false });
    } else {
        await ctx.scheduler.runAfter(0, internal.dashboard.resyncObjectiveProgress, {
            ...args,
            cursor: page.continueCursor,
        });
    }
    return null;
}
