import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { workflow } from '../workflow';
import { vWorkflowId } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';

export const handleObjectiveLifecycleComplete = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResultValidator,
        context: v.any(),
    },
    handler: async (ctx, args) => {
        const { result, context } = args;
        const objectiveId = context?.objectiveId;

        if (result.kind === 'failed') {
            console.error('Objective lifecycle workflow error:', result.error);
        }

        await workflow.cleanup(ctx, args.workflowId);

        return { handled: true, objectiveId: objectiveId ?? null };
    },
});
