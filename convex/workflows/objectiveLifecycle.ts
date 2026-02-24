/**
 * Objective Lifecycle Workflow
 *
 * This workflow manages the complete lifecycle of an objective:
 * 1. Monitors progress for auto-completion
 * 2. Sends reminders at appropriate intervals
 * 3. Checks for deadline approaching/overdue
 * 4. Detects stalled objectives
 *
 * The workflow runs indefinitely until the objective is completed or cancelled.
 */

import { v } from 'convex/values';
import { workflow } from '../workflow';
import { internal } from '../_generated/api';

/**
 * Workflow: Manage objective lifecycle
 *
 * This workflow is started when an objective is created and runs until:
 * - The objective is completed (currentValue >= targetValue)
 * - The objective is manually cancelled
 * - The objective is deleted
 *
 * Schedule:
 * - Daily: Check if objective should be auto-completed
 * - Daily: Check for recurring objective reset
 * - Weekly: Send reminder notification
 * - Near deadline: Send deadline approaching reminder
 * - Every 3 days: Check if objective is stalled
 */
export const objectiveLifecycle = workflow.define({
    args: {
        objectiveId: v.id('objectives'),
        userId: v.string(),
        // Optional configuration
        enableReminders: v.optional(v.boolean()),
        stallThresholdDays: v.optional(v.number()),
    },
    handler: async (step, args): Promise<void> => {
        const { objectiveId, userId, enableReminders = true, stallThresholdDays = 14 } = args;

        const oneDayMs = 24 * 60 * 60 * 1000;
        // Check objective status (stop if terminal or paused)
        const objectiveSnapshot = await step.runQuery(internal.objectiveInternals.getByIdInternal, {
            objectiveId,
        });

        if (!objectiveSnapshot) {
            return;
        }

        if (['completed', 'archived', 'deleted', 'paused'].includes(objectiveSnapshot.status)) {
            return;
        }

        // Check 1: Auto-complete if target reached
        const completionStatus = await step.runMutation(
            internal.steps.objectives.checkAutoComplete,
            { objectiveId }
        );

        if (completionStatus.status === 'completed') {
            // Objective completed - trigger achievement check
            await step.runMutation(internal.achievements.checkUserAchievements, {
                userId,
                trigger: 'objective_completed',
            });
            return;
        }

        // Check 1b: For recurring objectives, check if the period has ended and reset
        await step.runMutation(internal.steps.objectives.checkAndResetRecurring, {
            objectiveId,
        });

        // Check 2: Periodic reminder based on reminderInterval
        if (enableReminders) {
            await step.runMutation(internal.steps.objectives.sendPeriodicReminder, {
                objectiveId,
            });
        }

        // Check 3: Deadline approaching/overdue
        await step.runMutation(internal.steps.objectives.checkOverdue, {
            objectiveId,
        });

        // Check 4: Stalled objective
        await step.runMutation(internal.steps.objectives.markStalled, {
            objectiveId,
            stalledDays: stallThresholdDays,
        });

        // Schedule the next iteration after one day
        await step.runWorkflow(
            internal.workflows.objectiveLifecycle.objectiveLifecycle,
            {
                objectiveId,
                userId,
                enableReminders,
                stallThresholdDays,
            },
            { runAfter: oneDayMs }
        );
    },
});
