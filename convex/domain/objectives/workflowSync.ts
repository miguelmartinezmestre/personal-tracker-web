import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { workflow } from '../../workflow';

type ObjectiveWorkflowResource = 'objective' | 'progress_update';

export const runObjectiveSync = async (
    ctx: MutationCtx,
    objectiveId: Id<'objectives'>,
    userId: Id<'user'>,
    organizationId: Id<'organization'> | null | undefined,
    resourceType: ObjectiveWorkflowResource
) => {
    let canceledWorkflowId: Doc<'objectives'>['workflowId'];

    try {
        const objective = await ctx.db.get('objectives', objectiveId);
        if (objective?.workflowId) {
            await workflow.cancel(ctx, objective.workflowId);
            canceledWorkflowId = objective.workflowId;
        }

        const workflowId = await workflow.start(
            ctx,
            internal.jobs.objectives.lifecycleWorkflow.objectiveLifecycle,
            {
                objectiveId,
                userId,
            },
            {
                onComplete:
                    internal.jobs.objectives.lifecycleCompletion.handleObjectiveLifecycleComplete,
                context: {
                    objectiveId,
                    userId,
                    organizationId: organizationId ?? null,
                    resourceType,
                },
                startAsync: true,
            }
        );

        await ctx.db.patch('objectives', objectiveId, { workflowId });
    } catch (error) {
        if (canceledWorkflowId) {
            const objective = await ctx.db.get('objectives', objectiveId);
            if (objective?.workflowId === canceledWorkflowId) {
                await ctx.db.patch('objectives', objectiveId, { workflowId: undefined });
            }
        }

        if (organizationId) {
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId,
                actorUserId: userId,
                organizationId,
                action: 'WORKFLOW_ERROR',
                resourceType,
                resourceId: objectiveId,
                metadata: {
                    context:
                        error instanceof Error
                            ? 'objective_lifecycle_workflow_start_failed'
                            : 'objective_lifecycle_workflow_start_failed_unknown',
                },
                severity: 'warning',
            });
        }
    }
};
