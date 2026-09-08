import { v } from 'convex/values';
import { internal } from '../../_generated/api';
import { workflow } from '../../workflow';

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
        individualUserId: v.id('user'),
        organizationContributorUserId: v.id('user'),
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
            internal.jobs.objectives.syncObjectiveFromProgress.syncObjectiveFromProgress,
            {
                objectiveId: args.objectiveId,
                actorUserId: args.organizationContributorUserId,
            }
        );

        const status = syncResult.found ? syncResult.status : 'active';

        return {
            objectiveId: args.objectiveId,
            status,
            currentValue: syncResult.found ? syncResult.currentValue : 0,
            completedNow: syncResult.completedNow,
            reopened: syncResult.reopened,
        };
    },
});
