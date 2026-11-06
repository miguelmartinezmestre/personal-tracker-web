import type { MutationCtx } from '../../_generated/server';
import { deleteMembersBatch, hasMembers } from '../organizations/memberships';
import {
    deleteInvitationsForOrganizationBatch,
    hasInvitations,
} from '../organizations/invitations';
import { hasSessionsInOrganization } from '../auth/sessions';

export const ORGANIZATION_DELETION_BATCH_SIZE = 50;

export type OrganizationDeletionPhase =
    | 'progressUpdates'
    | 'objectivePermissions'
    | 'notifications'
    | 'achievements'
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
    organizationId: string
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
    organizationId: string
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

export async function deleteOrganizationNotificationsBatch(
    ctx: MutationCtx,
    organizationId: string
): Promise<number> {
    const rows = await ctx.db
        .query('notifications')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('notifications', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationAchievementsBatch(
    ctx: MutationCtx,
    organizationId: string
): Promise<number> {
    const rows = await ctx.db
        .query('organizationAchievements')
        .withIndex('by_organization_achievement', q => q.eq('organizationId', organizationId))
        .take(ORGANIZATION_DELETION_BATCH_SIZE);

    for (const row of rows) {
        await ctx.db.delete('organizationAchievements', row._id);
    }

    return rows.length;
}

export async function deleteOrganizationObjectivesBatch(
    ctx: MutationCtx,
    organizationId: string
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
    organizationId: string
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
    organizationId: string
): Promise<number> {
    return await deleteInvitationsForOrganizationBatch(
        ctx,
        organizationId,
        ORGANIZATION_DELETION_BATCH_SIZE
    );
}

export async function deleteOrganizationMembershipsBatch(
    ctx: MutationCtx,
    organizationId: string
): Promise<number> {
    return await deleteMembersBatch(ctx, organizationId, ORGANIZATION_DELETION_BATCH_SIZE);
}

export async function findOrganizationResiduePhase(
    ctx: MutationCtx,
    organizationId: string
): Promise<OrganizationDeletionPhase | null> {
    const remaining = await Promise.all([
        hasSessionsInOrganization(ctx, organizationId),
        ctx.db
            .query('progressUpdates')
            .withIndex('by_organization_date', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('objectivePermissions')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('notifications')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .first(),
        ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization_achievement', q => q.eq('organizationId', organizationId))
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
        hasInvitations(ctx, organizationId),
        hasMembers(ctx, organizationId),
    ]);

    const phases: OrganizationDeletionPhase[] = [
        'sessions',
        'progressUpdates',
        'objectivePermissions',
        'notifications',
        'achievements',
        'objectives',
        'categories',
        'invitations',
        'memberships',
    ];

    const residueIndex = remaining.findIndex(row => row !== null && row !== false);

    return residueIndex < 0 ? null : (phases.at(residueIndex) ?? null);
}

// In this order: rows that point at objectives go before them, and memberships last.
export const ORGANIZATION_BATCH_DELETERS = {
    progressUpdates: deleteOrganizationProgressUpdatesBatch,
    objectivePermissions: deleteOrganizationObjectivePermissionsBatch,
    notifications: deleteOrganizationNotificationsBatch,
    achievements: deleteOrganizationAchievementsBatch,
    objectives: deleteOrganizationObjectivesBatch,
    categories: deleteOrganizationCategoriesBatch,
    invitations: deleteOrganizationInvitationsBatch,
    memberships: deleteOrganizationMembershipsBatch,
} satisfies Partial<
    Record<OrganizationDeletionPhase, (ctx: MutationCtx, organizationId: string) => Promise<number>>
>;

export const ORGANIZATION_BATCH_ORDER = Object.keys(ORGANIZATION_BATCH_DELETERS) as Array<
    keyof typeof ORGANIZATION_BATCH_DELETERS
>;
