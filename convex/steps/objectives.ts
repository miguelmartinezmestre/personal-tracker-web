import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

export const syncObjectiveFromProgress = internalMutation({
  args: {
    objectiveId: v.id('objectives'),
  },
  handler: async (ctx, args) => {
    const objective = await ctx.db.get(args.objectiveId);
    if (!objective) {
      return { found: false, completedNow: false, reopened: false };
    }

    const updates = await ctx.db
      .query('progressUpdates')
      .withIndex('by_objective', q => q.eq('objective', args.objectiveId))
      .collect();

    const progressTotal = updates.reduce((sum, update) => sum + update.updatedValue, 0);
    const baseValue = objective.startValue ?? 0;
    const nextCurrentValue = baseValue + progressTotal;
    const nextStatus = nextCurrentValue >= objective.targetValue ? 'completed' : 'active';
    const completedNow = objective.status !== 'completed' && nextStatus === 'completed';
    const reopened = objective.status === 'completed' && nextStatus === 'active';
    const now = Date.now();

    await ctx.db.patch(args.objectiveId, {
      currentValue: nextCurrentValue,
      status: nextStatus,
      updatedAt: now,
    });

    if (completedNow) {
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

    return {
      found: true,
      completedNow,
      reopened,
      currentValue: nextCurrentValue,
      status: nextStatus,
    };
  },
});
