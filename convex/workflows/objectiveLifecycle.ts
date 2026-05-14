import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { workflow } from '../workflow';

const objectiveLifecycleResultValidator = v.object({
    objectiveId: v.id('objectives'),
    status: v.union(v.literal('active'), v.literal('completed')),
    currentValue: v.number(),
    completedNow: v.boolean(),
    reopened: v.boolean(),
});

export const objectiveLifecycle = workflow.define({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.id('user'),
    },
    returns: objectiveLifecycleResultValidator,
    handler: async (
        step,
        args
    ): Promise<{
        objectiveId: typeof args.objectiveId;
        status: 'active' | 'completed';
        currentValue: number;
        completedNow: boolean;
        reopened: boolean;
    }> => {
        const syncResult = await step.runMutation(
            internal.steps.objectives.syncObjectiveFromProgress,
            {
                objectiveId: args.objectiveId,
            }
        );

        if (syncResult.found && syncResult.completedNow) {
            await step.runMutation(internal.achievements.checkUserAchievements, {
                userId: args.userId,
                organizationId: syncResult.organizationId,
                trigger: 'objective_completed',
            });
        }

        const status = syncResult.status === 'completed' ? 'completed' : 'active';

        return {
            objectiveId: args.objectiveId,
            status,
            currentValue: syncResult.currentValue ?? 0,
            completedNow: syncResult.completedNow,
            reopened: syncResult.reopened,
        };
    },
});
