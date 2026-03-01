/**
 * Workflow Kickoff Mutations
 *
 * Internal mutations called as workflow completion handlers.
 */

import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { workflow } from '../workflow';
import { vWorkflowId } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';

/**
 * Internal Mutation: Handle objective lifecycle completion
 * Called automatically when the lifecycle workflow ends
 */
export const handleObjectiveLifecycleComplete = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResultValidator,
        context: v.any(),
    },
    handler: async (ctx, args) => {
        const { result, context } = args;
        const objectiveId = context?.objectiveId;

        // Log completion for observability
        if (result.kind === 'success') {
            // Objective was completed
            // Could trigger additional workflows here
        } else if (result.kind === 'failed') {
            // Log error for debugging
            console.error('Objective lifecycle workflow error:', result.error);
        } else if (result.kind === 'canceled') {
            // Workflow was canceled - objective might have been deleted
        }

        // Cleanup workflow storage
        await workflow.cleanup(ctx, args.workflowId);

        return { handled: true, objectiveId: objectiveId ?? null };
    },
});
