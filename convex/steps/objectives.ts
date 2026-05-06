import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { shouldSendProgressNotification } from '../notificationPreferences';

const PAGINATION_BATCH_SIZE = 500;

export const syncObjectiveFromProgress = internalMutation({
    args: {
        objectiveId: v.id('objectives'),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objectiveId);
        if (!objective) {
            return { found: false as const, completedNow: false, reopened: false };
        }


        let cursor: string | null = null;
        let isDone = false;
        let progressTotal = 0;
        let updateCount = 0;

        while (!isDone && updateCount < 10000) {
            const page = await ctx.db
                .query('progressUpdates')
                .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
                .paginate({ numItems: PAGINATION_BATCH_SIZE, cursor });

            for (const update of page.page) {
                progressTotal += update.updatedValue;
            }

            updateCount += page.page.length;
            isDone = page.isDone;
            cursor = page.continueCursor;
        }
        const baseValue = objective.startValue ?? 0;
        const nextCurrentValue = baseValue + progressTotal;
        const nextStatus = nextCurrentValue >= objective.targetValue ? 'completed' : 'active';
        const completedNow = objective.status !== 'completed' && nextStatus === 'completed';
        const reopened = objective.status === 'completed' && nextStatus === 'active';
        const now = Date.now();

        await ctx.db.patch('objectives', args.objectiveId, {
            currentValue: nextCurrentValue,
            status: nextStatus,
            updatedAt: now,
        });

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
            currentValue: nextCurrentValue,
            status: nextStatus,
            organizationId: objective.organizationId,
        };
    },
});
