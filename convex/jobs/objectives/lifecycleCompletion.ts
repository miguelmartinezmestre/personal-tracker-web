import { internalMutation } from '../../platform/db/internalMutation';
import { v } from 'convex/values';
import { internal } from '../../_generated/api';
import { workflow } from '../../workflow';
import { vWorkflowId } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';
const objectiveLifecycleContextValidator = v.object({
    objectiveId: v.id('objectives'),
    userId: v.id('user'),
    organizationId: v.union(v.id('organization'), v.null()),
    resourceType: v.union(v.literal('objective'), v.literal('progress_update')),
});
export const handleObjectiveLifecycleComplete = internalMutation({
    args: {
        workflowId: vWorkflowId,
        result: vResultValidator,
        context: objectiveLifecycleContextValidator,
    },
    returns: v.object({
        handled: v.boolean(),
        objectiveId: v.id('objectives'),
    }),
    handler: async (ctx, args) => {
        const { result, context } = args;
        try {
            const objective = await ctx.db.get('objectives', context.objectiveId);
            if (objective?.workflowId === args.workflowId) {
                await ctx.db.patch('objectives', context.objectiveId, {
                    workflowId: undefined,
                });
            }
            if (result.kind === 'failed') {
                console.error('Objective lifecycle workflow error:', result.error);
                if (context.organizationId) {
                    await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                        userId: context.userId,
                        actorUserId: context.userId,
                        organizationId: context.organizationId,
                        action: 'WORKFLOW_ERROR',
                        resourceType: context.resourceType,
                        resourceId: context.objectiveId,
                        metadata: {
                            context: 'objective_lifecycle_workflow_failed',
                        },
                        severity: 'warning',
                    });
                }
            }
            return { handled: true, objectiveId: context.objectiveId };
        } finally {
            await workflow.cleanup(ctx, args.workflowId);
        }
    },
});
