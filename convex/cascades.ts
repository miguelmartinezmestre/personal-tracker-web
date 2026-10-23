import {
    ORGANIZATION_DELETION_BATCH_SIZE,
    type OrganizationDeletionPhase,
    type OrganizationDeletionResult,
    deleteOrganizationCategoriesBatch,
    deleteOrganizationInvitationsBatch,
    deleteOrganizationMembershipsBatch,
    deleteOrganizationObjectivePermissionsBatch,
    deleteOrganizationObjectivesBatch,
    deleteOrganizationProgressUpdatesBatch,
    findOrganizationResiduePhase,
} from './features/cascades/organizationDeletion';
import {
    USER_DELETION_BATCH_SIZE,
    type UserDeletionPhase,
    type UserDeletionResult,
    anonymizeUser,
    deleteUserAccountsBatch,
    deleteUserMembershipsBatch,
    deleteUserObjectivePermissionsBatch,
    deleteUserSessionsBatch,
} from './features/cascades/userDeletion';
import { internal } from './_generated/api';
import { internalMutation } from './features/objectives/stats';
import {
    organizationDeletionPhaseValidator,
    userDeletionPhaseValidator,
} from './features/cascades/validators';
import { v } from 'convex/values';

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

                const nextPhase =
                    rowCount === USER_DELETION_BATCH_SIZE ? phase : 'objectivePermissions';

                await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
                    userId: args.userId,
                    phase: nextPhase,
                });

                return { status: 'in_progress', phase: nextPhase };
            }

            case 'objectivePermissions': {
                const rowCount = await deleteUserObjectivePermissionsBatch(ctx, args.userId);
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
                    rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : 'objectivePermissions';

                await ctx.scheduler.runAfter(
                    0,
                    internal.cascades.continueOrganizationDeletionCascade,
                    { organizationId, phase: nextPhase }
                );

                return { status: 'in_progress', phase: nextPhase };
            }

            case 'objectivePermissions': {
                const rowCount = await deleteOrganizationObjectivePermissionsBatch(
                    ctx,
                    organizationId
                );

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
