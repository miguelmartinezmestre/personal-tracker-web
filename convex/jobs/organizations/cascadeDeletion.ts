import { objectiveAggregate, progressAggregate } from '../../domain/dashboard/aggregates';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

const ORGANIZATION_DELETION_BATCH_SIZE = 50;

export type OrganizationDeletionPhase =
    | 'collaborators'
    | 'progress'
    | 'notifications'
    | 'objectives'
    | 'categories'
    | 'achievements'
    | 'audit'
    | 'invitations'
    | 'memberships'
    | 'sessions'
    | 'aggregates'
    | 'finalize';

type ContinueOrganizationDeletionArgs = {
    organizationId: Id<'organization'>;
    phase?: OrganizationDeletionPhase;
};

type OrganizationDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: OrganizationDeletionPhase;
};

async function scheduleNext(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    phase: OrganizationDeletionPhase
) {
    await ctx.scheduler.runAfter(0, internal.admin.continueOrganizationDeletionCascade, {
        organizationId,
        phase,
    });
}

async function advanceOrganizationDeletionPhase(args: {
    ctx: MutationCtx;
    organizationId: Id<'organization'>;
    currentPhase: OrganizationDeletionPhase;
    nextPhase: OrganizationDeletionPhase;
    rowCount: number;
}): Promise<OrganizationDeletionResult> {
    const next =
        args.rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? args.currentPhase : args.nextPhase;
    await scheduleNext(args.ctx, args.organizationId, next);
    return { status: 'in_progress', phase: next };
}

async function deleteOrganizationCollaboratorsPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('objectiveCollaborators')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('objectiveCollaborators', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'collaborators',
        nextPhase: 'progress',
        rowCount: rows.length,
    });
}

async function deleteOrganizationProgressPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('progressUpdates')
        .withIndex('by_organization_date', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('progressUpdates', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'progress',
        nextPhase: 'notifications',
        rowCount: rows.length,
    });
}

async function deleteOrganizationNotificationsPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('notifications')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('notifications', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'notifications',
        nextPhase: 'objectives',
        rowCount: rows.length,
    });
}

async function deleteOrganizationObjectivesPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('objectives')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('objectives', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'objectives',
        nextPhase: 'categories',
        rowCount: rows.length,
    });
}

async function deleteOrganizationCategoriesPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('categories')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('categories', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'categories',
        nextPhase: 'achievements',
        rowCount: rows.length,
    });
}

async function deleteOrganizationAchievementsPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('organizationAchievements')
        .withIndex('by_organization_achievement', q => q.eq('organization', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('organizationAchievements', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'achievements',
        nextPhase: 'audit',
        rowCount: rows.length,
    });
}

async function deleteOrganizationAuditPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('auditLogs')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('auditLogs', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'audit',
        nextPhase: 'invitations',
        rowCount: rows.length,
    });
}

async function deleteOrganizationInvitationsPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('invitation')
        .withIndex('organizationId', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('invitation', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'invitations',
        nextPhase: 'memberships',
        rowCount: rows.length,
    });
}

async function deleteOrganizationMembershipsPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const rows = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('member', row._id);
    }
    return await advanceOrganizationDeletionPhase({
        ctx,
        organizationId,
        currentPhase: 'memberships',
        nextPhase: 'sessions',
        rowCount: rows.length,
    });
}

async function deleteOrganizationAggregatesPhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const namespaces = await ctx.db
        .query('dashboardNamespaces')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(10);
    for (const entry of namespaces) {
        const aggregate = entry.kind === 'objectives' ? objectiveAggregate : progressAggregate;
        await aggregate.clear(ctx, { namespace: entry.namespace });
        await ctx.db.delete('dashboardNamespaces', entry._id);
    }
    const resyncs = await ctx.db
        .query('dashboardResyncs')
        .withIndex('by_organization_pending', q => q.eq('organizationId', organizationId))
        .take(50);
    for (const row of resyncs) {
        await ctx.db.delete('dashboardResyncs', row._id);
    }
    const state = await ctx.db
        .query('dashboardMigrations')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .first();
    if (state) {
        await ctx.db.delete('dashboardMigrations', state._id);
    }
    const phase = namespaces.length || resyncs.length || state ? 'aggregates' : 'finalize';
    await scheduleNext(ctx, organizationId, phase);
    return { status: 'in_progress', phase };
}

async function finalizeOrganizationDeletion(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionResult> {
    const remaining = await Promise.all([
        ctx.db
            .query('session')
            .withIndex('activeOrganizationId', q => q.eq('activeOrganizationId', organizationId))
            .first(),
        ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('progressUpdates')
            .withIndex('by_organization_date', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('notifications')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization_achievement', q => q.eq('organization', organizationId))
            .first(),
        ctx.db
            .query('auditLogs')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('invitation')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('dashboardNamespaces')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('dashboardResyncs')
            .withIndex('by_organization_pending', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('dashboardMigrations')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
    ]);
    const phases: OrganizationDeletionPhase[] = [
        'sessions',
        'collaborators',
        'progress',
        'notifications',
        'objectives',
        'categories',
        'achievements',
        'audit',
        'invitations',
        'memberships',
        'aggregates',
        'aggregates',
        'aggregates',
    ];
    const index = remaining.findIndex(row => row !== null);
    if (index >= 0) {
        const phase = phases.at(index);
        if (!phase) {
            throw new Error('Unknown organization residue phase');
        }
        await scheduleNext(ctx, organizationId, phase);
        return { status: 'in_progress', phase };
    }
    return { status: 'completed', phase: 'finalize' };
}

export async function startOrganizationDeletionCascade(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
) {
    if (await ctx.db.get('organization', organizationId)) {
        await ctx.db.delete('organization', organizationId);
    }
    await scheduleNext(ctx, organizationId, 'collaborators');
}

export async function continueOrganizationDeletionCascade(
    ctx: MutationCtx,
    args: ContinueOrganizationDeletionArgs
): Promise<OrganizationDeletionResult> {
    const phase = args.phase ?? 'collaborators';

    switch (phase) {
        case 'collaborators':
            return await deleteOrganizationCollaboratorsPhase(ctx, args.organizationId);
        case 'progress':
            return await deleteOrganizationProgressPhase(ctx, args.organizationId);
        case 'notifications':
            return await deleteOrganizationNotificationsPhase(ctx, args.organizationId);
        case 'objectives':
            return await deleteOrganizationObjectivesPhase(ctx, args.organizationId);
        case 'categories':
            return await deleteOrganizationCategoriesPhase(ctx, args.organizationId);
        case 'achievements':
            return await deleteOrganizationAchievementsPhase(ctx, args.organizationId);
        case 'audit':
            return await deleteOrganizationAuditPhase(ctx, args.organizationId);
        case 'invitations':
            return await deleteOrganizationInvitationsPhase(ctx, args.organizationId);
        case 'memberships':
            return await deleteOrganizationMembershipsPhase(ctx, args.organizationId);
        case 'aggregates':
            return await deleteOrganizationAggregatesPhase(ctx, args.organizationId);
        case 'sessions': {
            const { remaining } = await ctx.runMutation(
                internal.auth.recoverAffectedOrganizationSessions,
                { organizationId: args.organizationId }
            );
            const phase = remaining ? 'sessions' : 'aggregates';
            await scheduleNext(ctx, args.organizationId, phase);
            return { status: 'in_progress', phase };
        }
        case 'finalize':
            return await finalizeOrganizationDeletion(ctx, args.organizationId);
    }
}
