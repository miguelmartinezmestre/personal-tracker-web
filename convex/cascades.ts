import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { isPersonalOrganizationForUser } from './personalOrganization';
import { v } from 'convex/values';

const ORGANIZATION_DELETION_BATCH_SIZE = 50;
const USER_DELETION_BATCH_SIZE = 50;

const organizationDeletionPhaseValidator = v.union(
    v.literal('progressUpdates'),
    v.literal('objectives'),
    v.literal('categories'),
    v.literal('audit'),
    v.literal('invitations'),
    v.literal('memberships'),
    v.literal('sessions'),
    v.literal('finalize')
);

const userDeletionPhaseValidator = v.union(
    v.literal('sessions'),
    v.literal('accounts'),
    v.literal('memberships')
);

type OrganizationDeletionPhase =
    | 'progressUpdates'
    | 'objectives'
    | 'categories'
    | 'audit'
    | 'invitations'
    | 'memberships'
    | 'sessions'
    | 'finalize';

type UserDeletionPhase = 'sessions' | 'accounts' | 'memberships';

type OrganizationDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: OrganizationDeletionPhase;
};

type UserDeletionResult = {
    status: 'in_progress' | 'completed';
    phase: UserDeletionPhase;
};

export const cascadeUserDeletionInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await anonymizeUser(ctx, args.userId);
        await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
            userId: args.userId,
            phase: 'sessions',
        });
        return null;
    },
});

export const continueUserDeletionCascade = internalMutation({
    args: {
        userId: v.id('user'),
        phase: v.optional(userDeletionPhaseValidator),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: userDeletionPhaseValidator,
    }),
    handler: async (ctx, args): Promise<UserDeletionResult> => {
        const phase: UserDeletionPhase = args.phase ?? 'sessions';

        switch (phase) {
            case 'sessions': {
                const rowCount = await deleteUserSessionsBatch(ctx, args.userId);
                const nextPhase = rowCount === USER_DELETION_BATCH_SIZE ? phase : 'accounts';
                await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
                    userId: args.userId,
                    phase: nextPhase,
                });
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'accounts': {
                const rowCount = await deleteUserAccountsBatch(ctx, args.userId);
                const nextPhase = rowCount === USER_DELETION_BATCH_SIZE ? phase : 'memberships';
                await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
                    userId: args.userId,
                    phase: nextPhase,
                });
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'memberships': {
                const rowCount = await deleteUserMembershipsBatch(ctx, args.userId);
                if (rowCount === USER_DELETION_BATCH_SIZE) {
                    await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
                        userId: args.userId,
                        phase,
                    });
                    return { status: 'in_progress', phase };
                }
                return { status: 'completed', phase };
            }
        }
    },
});

export const cascadeOrganizationDeletionInternal = internalMutation({
    args: {
        organizationId: v.id('organization'),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (await ctx.db.get('organization', args.organizationId)) {
            await ctx.db.delete('organization', args.organizationId);
        }
        await ctx.scheduler.runAfter(0, internal.cascades.continueOrganizationDeletionCascade, {
            organizationId: args.organizationId,
            phase: 'progressUpdates',
        });
        return null;
    },
});

export const continueOrganizationDeletionCascade = internalMutation({
    args: {
        organizationId: v.id('organization'),
        phase: v.optional(organizationDeletionPhaseValidator),
    },
    returns: v.object({
        status: v.union(v.literal('in_progress'), v.literal('completed')),
        phase: organizationDeletionPhaseValidator,
    }),
    handler: async (ctx, args): Promise<OrganizationDeletionResult> => {
        const phase: OrganizationDeletionPhase = args.phase ?? 'progressUpdates';
        const { organizationId } = args;

        switch (phase) {
            case 'progressUpdates': {
                const rowCount = await deleteOrganizationProgressUpdatesBatch(ctx, organizationId);
                const nextPhase =
                    rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'objectives';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'objectives': {
                const rowCount = await deleteOrganizationObjectivesBatch(ctx, organizationId);
                const nextPhase =
                    rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'categories';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'categories': {
                const rowCount = await deleteOrganizationCategoriesBatch(ctx, organizationId);
                const nextPhase = rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'audit';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'audit': {
                const rowCount = await deleteOrganizationAuditLogsBatch(ctx, organizationId);
                const nextPhase =
                    rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'invitations';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'invitations': {
                const rowCount = await deleteOrganizationInvitationsBatch(ctx, organizationId);
                const nextPhase =
                    rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'memberships';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'memberships': {
                const rowCount = await deleteOrganizationMembershipsBatch(ctx, organizationId);
                const nextPhase =
                    rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'sessions';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'sessions': {
                const { remaining } = await ctx.runMutation(
                    internal.auth.recoverAffectedOrganizationSessions,
                    { organizationId }
                );
                const nextPhase = remaining ? phase : 'finalize';
                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );
                return { status: 'in_progress', phase: nextPhase };
            }
            case 'finalize': {
                const residuePhase = await findOrganizationResiduePhase(ctx, organizationId);
                if (residuePhase) {
                    await ctx.scheduler.runAfter(
                        0,
                        internal.cascades.continueOrganizationDeletionCascade,
                        { organizationId, phase: residuePhase }
                    );
                    return { status: 'in_progress', phase: residuePhase };
                }
                return { status: 'completed', phase: 'finalize' };
            }
        }
    },
});

async function deleteOrganizationProgressUpdatesBatch(
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

async function deleteOrganizationObjectivesBatch(
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

async function deleteOrganizationCategoriesBatch(
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

async function deleteOrganizationAuditLogsBatch(
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

async function deleteOrganizationInvitationsBatch(
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

async function deleteOrganizationMembershipsBatch(
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

async function findOrganizationResiduePhase(
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

async function anonymizeUser(ctx: MutationCtx, userId: Id<'user'>) {
    const user = await ctx.db.get('user', userId);
    if (!user || user.deletedAt !== undefined) {
        return;
    }
    const now = Date.now();
    await ctx.db.patch('user', userId, {
        name: 'Deleted account',
        email: `deleted-${String(userId)}@deleted.invalid`,
        emailVerified: false,
        image: null,
        userId: null,
        role: null,
        banned: true,
        banReason: 'Account deleted',
        banExpires: null,
        deletedAt: now,
        updatedAt: now,
    });
}

async function deleteUserSessionsBatch(ctx: MutationCtx, userId: Id<'user'>): Promise<number> {
    const rows = await ctx.db
        .query('session')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('session', row._id);
    }
    return rows.length;
}

async function deleteUserAccountsBatch(ctx: MutationCtx, userId: Id<'user'>): Promise<number> {
    const rows = await ctx.db
        .query('account')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const row of rows) {
        await ctx.db.delete('account', row._id);
    }
    return rows.length;
}

async function deleteUserMembershipsBatch(ctx: MutationCtx, userId: Id<'user'>): Promise<number> {
    const memberships = await ctx.db
        .query('member')
        .withIndex('userId', q => q.eq('userId', userId))
        .take(USER_DELETION_BATCH_SIZE);
    for (const membership of memberships) {
        await transferOrDeleteMembership(ctx, membership, userId);
    }
    return memberships.length;
}

async function transferOrDeleteMembership(
    ctx: MutationCtx,
    membership: {
        _id: Id<'member'>;
        organizationId: Id<'organization'>;
        role: string;
    },
    userId: Id<'user'>
) {
    const organization = await ctx.db.get('organization', membership.organizationId);
    const otherMembers = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', membership.organizationId))
        .take(USER_DELETION_BATCH_SIZE + 1);
    const successors = otherMembers
        .filter(member => member.userId !== userId)
        .sort((a, b) => a.createdAt - b.createdAt);
    let isPersonal = false;
    if (organization) {
        isPersonal = isPersonalOrganizationForUser({ metadata: organization.metadata, userId });
    }
    if (organization && (isPersonal || successors.length === 0)) {
        if (await ctx.db.get('organization', organization._id)) {
            await ctx.db.delete('organization', organization._id);
        }
        await ctx.scheduler.runAfter(0, internal.cascades.continueOrganizationDeletionCascade, {
            organizationId: organization._id,
            phase: 'progressUpdates',
        });
    } else if (membership.role === 'owner' && !successors.some(member => member.role === 'owner')) {
        const successor = successors.at(0);
        if (successor) {
            await ctx.db.patch('member', successor._id, { role: 'owner' });
        }
    }
    await ctx.db.delete('member', membership._id);
}
