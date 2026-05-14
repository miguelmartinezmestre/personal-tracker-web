import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { workflow } from '../workflow';
import { isVitestRuntime } from './testRuntime';

type ObjectiveWorkflowResource = 'objective' | 'progress_update';

export const runObjectiveSync = async (
    ctx: Parameters<typeof workflow.start>[0],
    objectiveId: Id<'objectives'>,
    userId: Id<'user'>,
    organizationId: Id<'organization'> | null | undefined,
    resourceType: ObjectiveWorkflowResource
) => {
    if (isVitestRuntime()) {
        return;
    }

    try {
        await workflow.start(
            ctx,
            internal.workflows.objectiveLifecycle.objectiveLifecycle,
            {
                objectiveId,
                userId,
            },
            {
                onComplete: internal.workflows.kickoff.handleObjectiveLifecycleComplete,
                context: {
                    objectiveId,
                    userId,
                    organizationId: organizationId ?? null,
                    resourceType,
                },
                startAsync: true,
            }
        );
    } catch (error) {
        if (organizationId) {
            await ctx.runMutation(internal.auditLogs.recordAuditLog, {
                userId,
                organizationId,
                action: 'WORKFLOW_ERROR',
                resourceType,
                resourceId: objectiveId,
                metadata: {
                    context: `Objective lifecycle workflow failed: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`,
                },
                severity: 'warning',
            });
        }
    }
};
