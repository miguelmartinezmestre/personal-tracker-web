import { v } from 'convex/values';
import { internalMutation } from '../../_generated/server';
import { shouldSendProgressNotification } from '../../domain/notifications/preferences';
import { reconcileObjectiveMetrics } from '../../domain/objectives/metrics';

export const syncObjectiveFromProgress = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        // A queued reconciliation may run after an objective was soft-deleted
        // or entered its purge workflow. It must not mutate metrics or recreate
        // notifications for a logically absent objective.
        if (!objective || objective.deletedAt !== undefined || objective.purgeToken !== undefined) {
            return {
                found: false as const,
                completedNow: false,
                earlyBirdCompletedNow: false,
                reopened: false,
            };
        }

        const { currentValue, status, completedNow, earlyBirdCompletedNow } =
            await reconcileObjectiveMetrics(ctx, objective._id);

        const reopened = objective.status === 'completed' && status === 'active';
        const now = Date.now();

        if (completedNow) {
            const notifyProgress = await shouldSendProgressNotification(ctx, objective.ownerId);
            if (notifyProgress) {
                await ctx.db.insert('notifications', {
                    userId: objective.ownerId,
                    organizationId: objective.organizationId,
                    objective: args.objectiveId,
                    read: false,
                    notificationType: 'status',
                    notificationDate: now,
                    message: `Objective "${objective.title}" completed.`,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        return {
            found: true as const,
            completedNow,
            earlyBirdCompletedNow,
            reopened,
            currentValue,
            status,
            organizationId: objective.organizationId,
        };
    },
});
