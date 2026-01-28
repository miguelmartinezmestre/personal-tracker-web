/**
 * Objective Lifecycle Workflow V2
 *
 * This workflow manages the complete lifecycle of an objective using durable workflows.
 * It handles state transitions, periodic ticks, and user signals.
 *
 * States:
 * - active: Normal operation, receiving ticks
 * - paused: Waiting for resume signal (no ticks)
 * - completed: Terminal state (auto or manual)
 * - archived: Terminal state (read-only)
 * - deleted: Terminal state (soft delete)
 */

import { v } from 'convex/values';
import { workflow } from '../workflow';
import { internal } from '../_generated/api';
import { vEventId, type WorkflowId } from '@convex-dev/workflow';

// Maximum iterations to prevent infinite loops (safety guard)
const MAX_ITERATIONS = 1000;

/**
 * Event definitions for objective lifecycle
 */
export const tickEvent = { name: 'tick' as const, validator: v.object({ seq: v.number() }) };
export const pauseEvent = { name: 'pause' as const, validator: v.object({ reason: v.optional(v.string()) }) };
export const resumeEvent = { name: 'resume' as const, validator: v.object({}) };
export const completeEvent = { name: 'complete' as const, validator: v.object({ completedAt: v.number(), autoCompleted: v.boolean() }) };
export const archiveEvent = { name: 'archive' as const, validator: v.object({ reason: v.optional(v.string()) }) };
export const deleteEvent = { name: 'delete' as const, validator: v.object({}) };
export const reconfigureEvent = { name: 'reconfigure' as const, validator: v.object({ newDeadline: v.optional(v.number()), newPeriod: v.optional(v.string()), newTargetValue: v.optional(v.number()) }) };

// Helper function to check if status is terminal
export function isTerminalStatus(status: string): boolean {
    return ['completed', 'archived', 'deleted'].includes(status);
}

/**
 * Main objective lifecycle workflow
 *
 * This workflow runs a single check and schedules the next iteration.
 */
export const objectiveLifecycleV2 = workflow.define({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.string(),
    },
    handler: async (step, args): Promise<{ finalStatus: string; reason: string }> => {
        const { objectiveId, userId } = args;

        // Do a single check and return
        // TODO: Implement full event-driven workflow
        const objective = await step.runQuery(
            internal.objectiveInternals.getByIdInternal,
            { objectiveId }
        );

        if (!objective) {
            return { finalStatus: 'not_found', reason: 'Objective was deleted' };
        }

        if (isTerminalStatus(objective.status)) {
            return { finalStatus: objective.status, reason: 'Reached terminal status' };
        }

        // If active and target reached, complete it
        if (objective.status === 'active' && objective.currentValue >= objective.targetValue) {
            await step.runMutation(
                internal.objectiveInternals.updateStatusInternal,
                { objectiveId, newStatus: 'completed' }
            );
            return { finalStatus: 'completed', reason: 'Auto-completed' };
        }

        // End here - the caller will schedule the next iteration
        return { finalStatus: objective.status, reason: 'Check complete' };
    },
});
