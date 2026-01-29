/**
 * Achievement Processing Workflow
 *
 * This workflow handles achievement checking and awarding in a resilient way.
 * It replaces the direct scheduler calls in update_progress with a proper workflow.
 *
 * Benefits over direct scheduler calls:
 * - Automatic retries on failure
 * - Better observability (workflow status, steps)
 * - Can handle long-running calculations
 * - Idempotent operations
 */

import { v } from 'convex/values';
import { workflow } from '../workflow';
import { internal } from '../_generated/api';

// Type for achievement check result
type AchievementCheckResult = {
  awarded?: string[];
  [key: string]: unknown;
};

/**
 * Workflow: Process achievements after progress update
 *
 * This workflow is triggered when:
 * - A user creates a new objective
 * - A user updates progress on an objective
 * - An objective is completed
 *
 * The workflow:
 * 1. Calculates current user statistics
 * 2. Checks each achievement category in parallel
 * 3. Awards new achievements
 * 4. Optionally checks organization achievements
 */
export const processAchievements = workflow.define({
  args: {
    userId: v.string(),
    organizationId: v.optional(v.string()),
    trigger: v.string(), // 'objective_created' | 'objective_completed' | 'progress_update'
    checkOrganization: v.optional(v.boolean()),
  },
  handler: async (step, args): Promise<{ awarded: string[] }> => {
    const { userId, organizationId, checkOrganization = false } = args;

    // Step 1: Calculate user statistics (deterministic)
    const stats = await step.runMutation(internal.steps.achievements.calculateUserStats, {
      userId,
    });

    // Step 2: Check achievement categories in parallel (faster)
    const categories: Array<'objectives_created' | 'objectives_completed' | 'streak' | 'progress_updates' | 'early_bird'> =
      ['objectives_created', 'objectives_completed', 'streak', 'progress_updates', 'early_bird'];

    const categoryResults = await Promise.all(
      categories.map(category =>
        step.runMutation(internal.steps.achievements.checkAchievementCategory, {
          userId,
          organizationId,
          category,
          stats,
        })
      )
    );

    // Collect all awarded achievements
    const awardedAchievements = categoryResults.flatMap((r: AchievementCheckResult) => r.awarded ?? []);

    // Step 3: Check organization achievements if enabled and orgId provided
    if (checkOrganization && organizationId) {
      const orgResult = await step.runMutation(
        internal.steps.achievements.checkOrganizationAchievementsCategory,
        {
          organizationId,
          triggerUserId: userId,
          category: 'all',
        }
      );
      awardedAchievements.push(...(orgResult.awarded ?? []));
    }

    return { awarded: awardedAchievements };
  },
});

/**
 * Variant: Lightweight achievement check for progress updates
 * Only checks relevant achievements (streak, progress_updates)
 * Faster than full check for frequent operations
 */
export const processProgressAchievements = workflow.define({
  args: {
    userId: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (step, args): Promise<{ awarded: string[] }> => {
    const { userId, organizationId } = args;

    // Calculate stats
    const stats = await step.runMutation(internal.steps.achievements.calculateUserStats, {
      userId,
    });

    // Only check streak and progress_updates for progress updates
    const relevantCategories: Array<'streak' | 'progress_updates'> = ['streak', 'progress_updates'];

    const categoryResults = await Promise.all(
      relevantCategories.map(category =>
        step.runMutation(internal.steps.achievements.checkAchievementCategory, {
          userId,
          organizationId,
          category,
          stats,
        })
      )
    );

    const awardedAchievements = categoryResults.flatMap((r: AchievementCheckResult) => r.awarded ?? []);

    return { awarded: awardedAchievements };
  },
});

/**
 * Variant: Achievement check for objective completion
 * Checks completion-related achievements
 */
export const processCompletionAchievements = workflow.define({
  args: {
    userId: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (step, args): Promise<{ awarded: string[] }> => {
    const { userId, organizationId } = args;

    // Calculate stats
    const stats = await step.runMutation(internal.steps.achievements.calculateUserStats, {
      userId,
    });

    // Check objectives_completed, early_bird
    const relevantCategories: Array<'objectives_completed' | 'early_bird'> = [
      'objectives_completed',
      'early_bird',
    ];

    const categoryResults = await Promise.all(
      relevantCategories.map(category =>
        step.runMutation(internal.steps.achievements.checkAchievementCategory, {
          userId,
          organizationId,
          category,
          stats,
        })
      )
    );

    const awardedAchievements = categoryResults.flatMap((r: AchievementCheckResult) => r.awarded ?? []);

    return { awarded: awardedAchievements };
  },
});
