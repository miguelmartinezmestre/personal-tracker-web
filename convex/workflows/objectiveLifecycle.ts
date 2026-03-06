import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { workflow } from '../workflow';

export const objectiveLifecycle = workflow.define({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.id('user'),
    },
    handler: async (
        step,
        args
    ): Promise<{
        objectiveId: typeof args.objectiveId;
        status: string;
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

        if (syncResult.completedNow) {
            await step.runMutation(internal.achievements.checkUserAchievements, {
                userId: args.userId,
                trigger: 'objective_completed',
            });
        }

        return {
            objectiveId: args.objectiveId,
            status: syncResult.status ?? 'active',
            currentValue: syncResult.currentValue ?? 0,
            completedNow: syncResult.completedNow,
            reopened: syncResult.reopened,
        };
    },
});
