import { v } from 'convex/values';
import { internalMutation } from '../../_generated/server';
import { shouldSendProgressNotification } from '../../domain/notifications/preferences';
import { recomputeObjectiveFromProgress } from '../../domain/objectives/metrics';

export const syncObjectiveFromProgress = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            return { found: false as const, completedNow: false, reopened: false };
        }

        const { currentValue, status, completedNow } = await recomputeObjectiveFromProgress(
            ctx,
            objective
        );

        const reopened = objective.status === 'completed' && status === 'active';
        const now = Date.now();

        if (completedNow) {
            const notifyProgress = await shouldSendProgressNotification(ctx, objective.userId);
            if (notifyProgress) {
                await ctx.db.insert('notifications', {
                    userId: objective.userId,
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
            reopened,
            currentValue,
            status,
            organizationId: objective.organizationId,
        };
    },
});
