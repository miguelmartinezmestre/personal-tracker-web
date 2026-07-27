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
    | 'finalize';

type ContinueOrganizationDeletionArgs = {
    organizationId: Id<'organization'>;
    phase?: OrganizationDeletionPhase;
    deleteOrganizationRecord?: boolean;
};

async function scheduleNext(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    phase: OrganizationDeletionPhase,
    deleteOrganizationRecord: boolean
) {
    await ctx.scheduler.runAfter(0, internal.admin.continueOrganizationDeletionCascade, {
        organizationId,
        phase,
        deleteOrganizationRecord,
    });
}

export async function startOrganizationDeletionCascade(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    deleteOrganizationRecord = false
) {
    await scheduleNext(ctx, organizationId, 'collaborators', deleteOrganizationRecord);
}

export async function continueOrganizationDeletionCascade(
    ctx: MutationCtx,
    args: ContinueOrganizationDeletionArgs
): Promise<{ status: 'in_progress' | 'completed'; phase: OrganizationDeletionPhase }> {
    const phase = args.phase ?? 'collaborators';
    const deleteOrganizationRecord = args.deleteOrganizationRecord ?? false;

    if (phase === 'collaborators') {
        const rows = await ctx.db
            .query('objectiveCollaborators')
            .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('objectiveCollaborators', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('progress' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'progress') {
        const rows = await ctx.db
            .query('progressUpdates')
            .withIndex('by_organization_date', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('progressUpdates', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('notifications' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'notifications') {
        const rows = await ctx.db
            .query('notifications')
            .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('notifications', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('objectives' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'objectives') {
        const rows = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('objectives', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('categories' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'categories') {
        const rows = await ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('categories', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('achievements' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'achievements') {
        const achievement = await ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization_achievement', q =>
                q.eq('organization', args.organizationId)
            )
            .first();
        if (!achievement) {
            await scheduleNext(ctx, args.organizationId, 'audit', deleteOrganizationRecord);
            return { status: 'in_progress', phase: 'audit' };
        }

        const contributors = await ctx.db
            .query('organizationAchievementContributors')
            .withIndex('by_organizationAchievement_user', q =>
                q.eq('organizationAchievementId', achievement._id)
            )
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const contributor of contributors) {
            await ctx.db.delete('organizationAchievementContributors', contributor._id);
        }
        if (contributors.length < ORGANIZATION_DELETION_BATCH_SIZE) {
            await ctx.db.delete('organizationAchievements', achievement._id);
        }
        await scheduleNext(ctx, args.organizationId, phase, deleteOrganizationRecord);
        return { status: 'in_progress', phase };
    }

    if (phase === 'audit') {
        const rows = await ctx.db
            .query('auditLogs')
            .withIndex('by_organization', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('auditLogs', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('invitations' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'invitations') {
        const rows = await ctx.db
            .query('invitation')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('invitation', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('memberships' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (phase === 'memberships') {
        const rows = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .take(ORGANIZATION_DELETION_BATCH_SIZE);
        for (const row of rows) await ctx.db.delete('member', row._id);
        const next =
            rows.length === ORGANIZATION_DELETION_BATCH_SIZE ? phase : ('finalize' as const);
        await scheduleNext(ctx, args.organizationId, next, deleteOrganizationRecord);
        return { status: 'in_progress', phase: next };
    }

    if (deleteOrganizationRecord) {
        const organization = await ctx.db.get('organization', args.organizationId);
        if (organization) await ctx.db.delete('organization', args.organizationId);
    }
    return { status: 'completed', phase };
}
