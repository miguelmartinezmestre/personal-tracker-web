import {
    ORGANIZATION_BATCH_DELETERS,
    ORGANIZATION_BATCH_ORDER,
    ORGANIZATION_DELETION_BATCH_SIZE,
    type OrganizationDeletionPhase,
    type OrganizationDeletionResult,
    findOrganizationResiduePhase,
} from './features/cascades/organizationDeletion';
import {
    USER_DELETION_BATCH_SIZE,
    type UserDeletionPhase,
    type UserDeletionResult,
    anonymizeUser,
    deleteUserAccountsBatch,
    deleteUserMembershipsBatch,
    deleteUserAchievementsBatch,
    deleteUserNotificationsBatch,
    deleteUserObjectivePermissionsBatch,
    deleteUserSessionsBatch,
} from './features/cascades/userDeletion';
import { internal } from './_generated/api';
import { internalMutation } from './features/objectives/stats';
import {
    organizationDeletionPhaseValidator,
    userDeletionOutcomeValidator,
    userDeletionPhaseValidator,
} from './features/cascades/validators';
import { v } from 'convex/values';
import { insertAuditLog } from './features/audit/log';
import { findAccountDeletionBlocker } from './features/auth/accountDeletion';
import { removeOrganization } from './features/organizations/memberships';
import { recoverSessionsForDeletedOrganization } from './features/auth/sessions';

export const cascadeUserDeletionInternal = internalMutation({
    args: {
        userId: v.id('user'),
    },
    returns: userDeletionOutcomeValidator,
    handler: async (ctx, args) => {
        // Checked again inside this transaction: two owners deleting their accounts at the
        // same time must not leave an organization without an owner.
        const blocker = await findAccountDeletionBlocker(ctx.db, args.userId);

        if (blocker) {
            return blocker;
        }

        await insertAuditLog(ctx, {
            action: 'user.deleted',
            resourceType: 'user',
            resourceId: args.userId,
            userId: args.userId,
            severity: 'critical',
        });
        await anonymizeUser(ctx, args.userId);
        await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
            userId: args.userId,
            phase: 'sessions',
        });

        return 'deleted' as const;
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
                const nextPhase = rowCount === USER_DELETION_BATCH_SIZE ? phase : 'notifications';
                await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
                    userId: args.userId,
                    phase: nextPhase,
                });

                return { status: 'in_progress', phase: nextPhase };
            }

            case 'notifications': {
                const rowCount = await deleteUserNotificationsBatch(ctx, args.userId);
                const nextPhase = rowCount === USER_DELETION_BATCH_SIZE ? phase : 'achievements';
                await ctx.scheduler.runAfter(0, internal.cascades.continueUserDeletionCascade, {
                    userId: args.userId,
                    phase: nextPhase,
                });

                return { status: 'in_progress', phase: nextPhase };
            }

            case 'achievements': {
                const rowCount = await deleteUserAchievementsBatch(ctx, args.userId);
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
        await removeOrganization(ctx, args.organizationId);

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
        let nextPhase: OrganizationDeletionPhase;

        if (phase === 'finalize') {
            const residuePhase = await findOrganizationResiduePhase(ctx, organizationId);

            if (!residuePhase) {
                return { status: 'completed', phase };
            }

            nextPhase = residuePhase;
        } else if (phase === 'sessions') {
            const { remaining } = await recoverSessionsForDeletedOrganization(ctx, organizationId);

            nextPhase = remaining ? phase : 'finalize';
        } else {
            const rowCount = await ORGANIZATION_BATCH_DELETERS[phase](ctx, organizationId);
            const next = ORGANIZATION_BATCH_ORDER.at(ORGANIZATION_BATCH_ORDER.indexOf(phase) + 1);
            nextPhase =
                rowCount === ORGANIZATION_DELETION_BATCH_SIZE ? phase : (next ?? 'sessions');
        }

        await ctx.scheduler.runAfter(0, internal.cascades.continueOrganizationDeletionCascade, {
            organizationId,
            phase: nextPhase,
        });

        return { status: 'in_progress', phase: nextPhase };
    },
});
