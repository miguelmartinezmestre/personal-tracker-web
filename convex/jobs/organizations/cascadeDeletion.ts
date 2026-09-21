import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

const ORGANIZATION_DELETION_BATCH_SIZE = 50;

export type OrganizationDeletionPhase =
    'categories' | 'audit' | 'invitations' | 'memberships' | 'sessions' | 'finalize';

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
    await ctx.scheduler.runAfter(0, internal.cascades.continueOrganizationDeletionCascade, {
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
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
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
    ]);
    const phases: OrganizationDeletionPhase[] = [
        'sessions',
        'categories',
        'audit',
        'invitations',
        'memberships',
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
    await scheduleNext(ctx, organizationId, 'categories');
}

export async function continueOrganizationDeletionCascade(
    ctx: MutationCtx,
    args: ContinueOrganizationDeletionArgs
): Promise<OrganizationDeletionResult> {
    const phase = args.phase ?? 'categories';

    switch (phase) {
        case 'categories':
            return await deleteOrganizationCategoriesPhase(ctx, args.organizationId);
        case 'audit':
            return await deleteOrganizationAuditPhase(ctx, args.organizationId);
        case 'invitations':
            return await deleteOrganizationInvitationsPhase(ctx, args.organizationId);
        case 'memberships':
            return await deleteOrganizationMembershipsPhase(ctx, args.organizationId);
        case 'sessions': {
            const { remaining } = await ctx.runMutation(
                internal.auth.recoverAffectedOrganizationSessions,
                { organizationId: args.organizationId }
            );
            const nextPhase = remaining ? 'sessions' : 'finalize';
            await scheduleNext(ctx, args.organizationId, nextPhase);
            return { status: 'in_progress', phase: nextPhase };
        }
        case 'finalize':
            return await finalizeOrganizationDeletion(ctx, args.organizationId);
    }
}
