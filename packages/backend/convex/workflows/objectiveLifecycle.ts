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
    reminderIntervalDays: v.optional(v.number()),
    stallThresholdDays: v.optional(v.number()),
  },
  handler: async (step, args): Promise<void> => {
    const {
      objectiveId,
      userId,
      enableReminders = true,
      reminderIntervalDays = 7,
      stallThresholdDays = 14,
    } = args;

    // Day 1: Initial check
    const initialStatus = await step.runMutation(
      internal.steps.objectives.checkAutoComplete,
      { objectiveId },
    );

    // If already completed, end workflow
    if (initialStatus.status === 'already_completed') {
      return;
    }

    // Main monitoring loop - runs indefinitely until cancelled or completed
    let iterationCount = 0;
    const maxIterations = 365; // Prevent infinite loops (1 year of daily checks)

    while (iterationCount < maxIterations) {
      iterationCount++;

      // Wait one day between checks
      const oneDayMs = 24 * 60 * 60 * 1000;
      await step.sleep(oneDayMs);

      // Check 1: Auto-complete if target reached
      const completionStatus = await step.runMutation(
        internal.steps.objectives.checkAutoComplete,
        { objectiveId },
      );

      if (completionStatus.status === 'completed') {
        // Objective completed - trigger achievement check and end workflow
        await step.runMutation(internal.achievements.checkUserAchievements, {
          userId,
          trigger: 'objective_completed',
        });
        return;
      }

      // Check 2: Deadline approaching (3 days before)
      if (iterationCount % reminderIntervalDays === 0) {
        await step.runMutation(internal.steps.objectives.sendReminder, {
          objectiveId,
          reminderType: 'deadline_approaching',
          dedupeKey: `deadline_${iterationCount}`,
        });
      }

      // Check 3: Stalled objective (every 3 days)
      if (iterationCount % 3 === 0) {
        await step.runMutation(internal.steps.objectives.markStalled, {
          objectiveId,
          stalledDays: stallThresholdDays,
        });
      }

      // Check 4: Overdue check
      await step.runMutation(internal.steps.objectives.checkOverdue, {
        objectiveId,
      });
    }

    // Safety: if we reach max iterations, end gracefully
    // A new workflow can be started if needed
  },
});

/**
 * Variant: Short-lived workflow for one-time progress check
 * Use this when you want to trigger checks after progress updates
 * without running a long-lived workflow
 */
export const progressCheckWorkflow = workflow.define({
  args: {
    objectiveId: v.id('objectives'),
    userId: v.string(),
  },
  handler: async (step, args): Promise<{ completed: boolean; achievementsAwarded: string[] }> => {
    const { objectiveId, userId } = args;

    // Check if objective should be auto-completed
    const completionStatus = await step.runMutation(
      internal.steps.objectives.checkAutoComplete,
      { objectiveId },
    );

    let achievementsAwarded: string[] = [];

    if (completionStatus.status === 'completed') {
      // Trigger achievement check
      const achievementResult = await step.runMutation(
        internal.achievements.checkUserAchievements,
        {
          userId,
          trigger: 'objective_completed',
        },
      );

      achievementsAwarded = achievementResult.awarded ?? [];
    }

    return {
      completed: completionStatus.status === 'completed',
      achievementsAwarded,
    };
  },
});
