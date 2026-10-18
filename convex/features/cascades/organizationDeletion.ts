import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

export const ORGANIZATION_DELETION_BATCH_SIZE = 50;

export type OrganizationDeletionPhase =
    | 'progressUpdates'
    | 'objectives'
    | 'categories'
    | 'audit'
    | 'invitations'
    | 'memberships'
    | 'sessions'
    | 'finalize';

export type OrganizationDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: OrganizationDeletionPhase;
};

export async function deleteOrganizationProgressUpdatesBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('progressUpdates')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('progressUpdates', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationObjectivesBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('objectives')
        .withIndex('by_organization_createdAt', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('objectives', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationCategoriesBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('categories')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('categories', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationAuditLogsBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('auditLogs')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('auditLogs', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationInvitationsBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('invitation')
        .withIndex('organizationId', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('invitation', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationMembershipsBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('member', row._id);
    }

    return rows.length;
}

export async function findOrganizationResiduePhase(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<OrganizationDeletionPhase | null> {
    const remaining = await Promise.all([
        ctx.db
            .query('session')
            .withIndex('activeOrganizationId', q => q.eq('activeOrganizationId', organizationId))
            .first(),
        ctx.db
            .query('progressUpdates')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('objectives')
            .withIndex('by_organization_createdAt', q => q.eq('organizationId', organizationId))
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
        'progressUpdates',
        'objectives',
        'categories',
        'audit',
        'invitations',
        'memberships',
    ];

    const residueIndex = remaining.findIndex(row => row !== null);

    return residueIndex < 0 ? null : (phases.at(residueIndex) ?? null);
}
