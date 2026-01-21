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
import { workflow } from './workflow';
import { internal } from './_generated/api';
import {
    tickEvent,
    pauseEvent,
    resumeEvent,
    completeEvent,
    archiveEvent,
    deleteEvent,
    reconfigureEvent,
    isTerminalStatus,
} from './objectiveEvents';

// Maximum iterations to prevent infinite loops (safety guard)
const MAX_ITERATIONS = 1000;

// Brief delay for workflowId to be stored (in ms)
const WORKFLOW_INIT_DELAY_MS = 100;

/**
 * Main objective lifecycle workflow
 *
 * This workflow runs indefinitely until the objective reaches a terminal state.
 * It processes events from users and periodic ticks from the scheduler.
 */
export const objectiveLifecycleV2 = workflow.define({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.string(),
    },
    handler: async (step, args): Promise<{ finalStatus: string; reason: string }> => {
        const { objectiveId, userId } = args;

        // Brief delay to allow workflowId to be stored in the objective
        // This handles the race condition between workflow.start() returning
        // and the objective being patched with the workflowId
        await step.sleep(WORKFLOW_INIT_DELAY_MS);

        let iteration = 0;

        while (iteration < MAX_ITERATIONS) {
            iteration++;

            // 1. Read current objective state
            const objective = await step.runQuery(
                internal.objectiveInternals.getByIdInternal,
                { objectiveId }
            );

            // 2. If not found or terminal → end workflow
            if (!objective) {
                return { finalStatus: 'not_found', reason: 'Objective was deleted' };
            }

            if (isTerminalStatus(objective.status)) {
                return { finalStatus: objective.status, reason: 'Reached terminal status' };
            }

            // 3. Handle PAUSED state - only wait for signals (no ticks)
            if (objective.status === 'paused') {
                // Wait for any of these events (no timeout, indefinite wait)
                const event = await step.awaitEvent(
                    resumeEvent,
                    completeEvent,
                    archiveEvent,
                    deleteEvent
                );

                // Process the received event
                if (event.name === 'resume') {
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'active' }
                    );
                    // Continue loop - will enter active state handling
                    continue;
                }

                if (event.name === 'complete') {
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'completed' }
                    );
                    return { finalStatus: 'completed', reason: 'Manually completed while paused' };
                }

                if (event.name === 'archive') {
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'archived' }
                    );
                    return { finalStatus: 'archived', reason: 'Archived while paused' };
                }

                if (event.name === 'delete') {
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'deleted' }
                    );
                    return { finalStatus: 'deleted', reason: 'Deleted while paused' };
                }

                // Unknown event, continue loop
                continue;
            }

            // 4. Handle ACTIVE state - program tick and wait for signals
            if (objective.status === 'active') {
                // Get workflowId from the objective document (stored when workflow started)
                // We need to pass it to the scheduler so it can send events back
                const workflowId = objective.workflowId;

                if (!workflowId) {
                    // No workflowId stored yet, wait a bit and retry
                    // This can happen on the first iteration due to race condition
                    await step.sleep(WORKFLOW_INIT_DELAY_MS);
                    continue;
                }

                // Schedule the next tick
                await step.runAction(
                    internal.objectiveInternals.computeNextTickInternal,
                    { objectiveId, workflowId: workflowId as ReturnType<typeof import('@convex-dev/workflow').vWorkflowId['parse']> }
                );

                // Wait for any event
                const event = await step.awaitEvent(
                    tickEvent,
                    pauseEvent,
                    resumeEvent,
                    completeEvent,
                    archiveEvent,
                    deleteEvent,
                    reconfigureEvent
                );

                // Process the received event
                if (event.name === 'tick') {
                    // Process the tick (checks auto-completion, deadline, etc.)
                    const tickResult = await step.runMutation(
                        internal.objectiveInternals.onTickInternal,
                        { objectiveId, seq: event.value.seq }
                    );

                    if (tickResult.autoCompleted) {
                        // Trigger achievement check for objective completion
                        await step.runMutation(internal.achievements.checkUserAchievements, {
                            userId,
                            trigger: 'objective_completed',
                        });
                        return { finalStatus: 'completed', reason: 'Auto-completed (target reached)' };
                    }

                    // Continue loop for next tick
                    continue;
                }

                if (event.name === 'pause') {
                    // Clear pending tick before pausing
                    await step.runMutation(
                        internal.objectiveInternals.clearNextTickInternal,
                        { objectiveId }
                    );
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'paused' }
                    );
                    // Continue loop - will enter paused state handling
                    continue;
                }

                if (event.name === 'resume') {
                    // Already active, ignore resume
                    continue;
                }

                if (event.name === 'complete') {
                    // Clear pending tick
                    await step.runMutation(
                        internal.objectiveInternals.clearNextTickInternal,
                        { objectiveId }
                    );
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'completed' }
                    );
                    // Trigger achievement check
                    await step.runMutation(internal.achievements.checkUserAchievements, {
                        userId,
                        trigger: 'objective_completed',
                    });
                    return { finalStatus: 'completed', reason: 'Manually completed' };
                }

                if (event.name === 'archive') {
                    // Clear pending tick
                    await step.runMutation(
                        internal.objectiveInternals.clearNextTickInternal,
                        { objectiveId }
                    );
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'archived' }
                    );
                    return { finalStatus: 'archived', reason: 'Archived' };
                }

                if (event.name === 'delete') {
                    // Clear pending tick
                    await step.runMutation(
                        internal.objectiveInternals.clearNextTickInternal,
                        { objectiveId }
                    );
                    await step.runMutation(
                        internal.objectiveInternals.updateStatusInternal,
                        { objectiveId, newStatus: 'deleted' }
                    );
                    return { finalStatus: 'deleted', reason: 'Soft deleted' };
                }

                if (event.name === 'reconfigure') {
                    // Clear current tick (will be rescheduled on next iteration)
                    await step.runMutation(
                        internal.objectiveInternals.clearNextTickInternal,
                        { objectiveId }
                    );
                    // The reconfiguration itself is handled by the public mutation
                    // that sent this event, we just need to reschedule the tick
                    continue;
                }

                // Unknown event, continue loop
                continue;
            }

            // Unknown status, end workflow for safety
            return { finalStatus: objective.status, reason: 'Unknown status' };
        }

        // Safety: max iterations reached
        return { finalStatus: 'max_iterations', reason: 'Safety limit reached' };
    },
});
