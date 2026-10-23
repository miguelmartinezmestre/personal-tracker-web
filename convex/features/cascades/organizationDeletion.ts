import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

export const ORGANIZATION_DELETION_BATCH_SIZE = 50;

export type OrganizationDeletionPhase =
    | 'progressUpdates'
    | 'objectivePermissions'
    | 'objectives'
    | 'categories'
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
        .withIndex('by_organization_date', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('progressUpdates', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationObjectivePermissionsBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('objectivePermissions')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('objectivePermissions', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationObjectivesBatch(
    ctx: MutationCtx,
    organizationId: Id<'organization'>
): Promise<number> {
    const rows = await ctx.db
        .query('objectives')
        .withIndex('by_organization_deletedAt_createdAt', q =>
            q.eq('organizationId', organizationId)
        )
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
            .withIndex('by_organization_date', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('objectivePermissions')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_createdAt', q =>
                q.eq('organizationId', organizationId)
            )
            .first(),
        ctx.db
            .query('categories')
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
        'objectivePermissions',
        'objectives',
        'categories',
        'invitations',
        'memberships',
    ];

    const residueIndex = remaining.findIndex(row => row !== null);

    return residueIndex < 0 ? null : (phases.at(residueIndex) ?? null);
}
