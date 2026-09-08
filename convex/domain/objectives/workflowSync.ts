import { requireOperationalOrganization } from '../organizations/operational';
import { internal } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { workflow } from '../../workflow';

type ObjectiveWorkflowResource = 'objective' | 'progress_update';

type ObjectiveSyncArgs = {
    ctx: MutationCtx;
    objectiveId: Id<'objectives'>;
    individualUserId: Id<'user'>;
    organizationContributorUserId: Id<'user'>;
    organizationId: Id<'organization'> | null | undefined;
    resourceType: ObjectiveWorkflowResource;
};

export const runObjectiveSync = async ({
    ctx,
    objectiveId,
    individualUserId,
    organizationContributorUserId,
    organizationId,
    resourceType,
}: ObjectiveSyncArgs) => {
    let canceledWorkflowId: Doc<'objectives'>['workflowId'];

    try {
        const objective = await ctx.db.get('objectives', objectiveId);
        if (!objective || objective.deletedAt !== undefined) {
            return;
        }
        await requireOperationalOrganization(ctx, objective.organizationId);
        if (objective.workflowId) {
            await workflow.cancel(ctx, objective.workflowId);
            canceledWorkflowId = objective.workflowId;
        }

        const workflowId = await workflow.start(
            ctx,
            internal.jobs.objectives.lifecycleWorkflow.objectiveLifecycle,
            {
                objectiveId,
                individualUserId,
                organizationContributorUserId,
            },
            {
                onComplete:
                    internal.jobs.objectives.lifecycleCompletion.handleObjectiveLifecycleComplete,
                context: {
                    objectiveId,
                    userId: organizationContributorUserId,
                    organizationId: organizationId ?? null,
                    resourceType,
                },
                startAsync: false,
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
                userId: organizationContributorUserId,
                actorUserId: organizationContributorUserId,
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
