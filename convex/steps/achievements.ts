/**
 * Internal Steps for Achievement Processing
 *
 * These steps contain the business logic for checking and awarding achievements.
 * They are designed to be idempotent and safe for retries.
 */

import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

/**
 * Step: Calculate user statistics for achievement checking
 * This is a read-only step that gathers data needed for achievement evaluation
 */
export const calculateUserStats = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // Get all user objectives
    const objectives = await ctx.db
      .query('objectives')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const completedObjectives = objectives.filter(o => o.status === 'completed');

    // Get all progress updates for user's objectives
    const objectiveIds = objectives.map(o => o._id);
    const allUpdates = await ctx.db.query('progressUpdates').collect();
    const userUpdates = allUpdates.filter(pu => objectiveIds.includes(pu.objective));

    // Calculate streak
    // Import the calculation function
    const { calculateUserStreakInternal } = await import('../achievements_utils/calculations');
    const streak = await calculateUserStreakInternal(ctx, userId);

    // Count early bird completions
    const earlyCompletions = completedObjectives.filter(o => {
      if (!o.deadline) return false;
      return o.updatedAt <= o.deadline;
    }).length;

    return {
      totalObjectives: objectives.length,
      completedObjectives: completedObjectives.length,
      totalProgressUpdates: userUpdates.length,
      streak,
      earlyCompletions,
    };
  },
});

/**
 * Step: Check and award specific achievement category
 * This makes the achievement checking more granular and retry-safe
 */
export const checkAchievementCategory = internalMutation({
  args: {
    userId: v.string(),
    organizationId: v.optional(v.string()),
    category: v.string(), // 'objectives_created' | 'objectives_completed' | 'streak' | 'progress_updates' | 'early_bird'
    stats: v.object({
      totalObjectives: v.number(),
      completedObjectives: v.number(),
      totalProgressUpdates: v.number(),
      streak: v.number(),
      earlyCompletions: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId, category, stats } = args;
    const now = Date.now();

    // Get achievement definitions for this category
    const allDefinitions = await ctx.db.query('achievementDefinitions').collect();
    const categoryDefinitions = allDefinitions.filter(
      d => d.isActive && d.type === 'individual' && d.code.includes(category)
    );

    // Get already earned achievements
    const earnedAchievements = await ctx.db
      .query('obtainedAchievements')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const earnedCodes = new Set(
      await Promise.all(
        earnedAchievements.map(async ea => {
          const def = await ctx.db.get('achievementDefinitions', ea.achievement);
          return def?.code;
        })
      )
    );

    const newAchievements: string[] = [];

    for (const def of categoryDefinitions) {
      if (earnedCodes.has(def.code)) continue;

      let shouldAward = false;

      // Evaluate based on category
      switch (category) {
        case 'objectives_created':
          const targetCreated = extractNumberFromCode(def.code);
          shouldAward = stats.totalObjectives >= targetCreated;
          break;
        case 'objectives_completed':
          const targetCompleted = extractNumberFromCode(def.code);
          shouldAward = stats.completedObjectives >= targetCompleted;
          break;
        case 'streak':
          const targetStreak = extractNumberFromCode(def.code);
          shouldAward = stats.streak >= targetStreak;
          break;
        case 'progress_updates':
          const targetUpdates = extractNumberFromCode(def.code);
          shouldAward = stats.totalProgressUpdates >= targetUpdates;
          break;
        case 'early_bird':
          shouldAward = stats.earlyCompletions >= 1;
          break;
      }

      if (shouldAward) {
        // Award the achievement (idempotent - would fail if already exists)
        try {
          await ctx.db.insert('obtainedAchievements', {
            userId: userId,
            achievement: def._id,
            earnedAt: now,
            createdAt: now,
            updatedAt: now,
          });

          // Create notification
          await ctx.db.insert('notifications', {
            userId: userId,
            organizationId: organizationId ?? '',
            objective: undefined,
            read: false,
            notificationType: 'achievement',
            notificationDate: now,
            message: `Achievement unlocked: "${def.code}"! You earned ${def.points} points.`,
            createdAt: now,
            updatedAt: now,
          });

          newAchievements.push(def.code);
        } catch (error) {
          // Ignore duplicate insert errors (already earned)
          // This makes the step idempotent
        }
      }
    }

    return { awarded: newAchievements, category };
  },
});

/**
 * Helper: Extract number from achievement code
 * Examples: "objectives_created_5" -> 5, "streak_7" -> 7
 */
function extractNumberFromCode(code: string): number {
  const match = code.match(/(\d+)$/);
  return match && match[1] !== undefined ? parseInt(match[1], 10) : 0;
}

/**
 * Step: Check organization achievements
 * Similar to individual but for organization-level stats
 */
export const checkOrganizationAchievementsCategory = internalMutation({
  args: {
    organizationId: v.string(),
    triggerUserId: v.string(),
    category: v.string(),
  },
  handler: async (_, args) => {
    const { organizationId, category } = args;

    // This would use the BetterAuth adapter to get org members
    // For now, return empty - implementation depends on your auth structure
    // TODO: Implement org achievement checking based on your auth schema

    return { awarded: [], category, organizationId };
  },
});

/**
 * Step: Batch check multiple achievements at once
 * More efficient than calling each category separately
 */
export const checkAllAchievements = internalMutation({
  args: {
    userId: v.string(),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // Calculate stats once
    const stats = await ctx.db
      .query('objectives')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()
      .then(async objectives => {
        const completedObjectives = objectives.filter(o => o.status === 'completed');
        const objectiveIds = objectives.map(o => o._id);
        const allUpdates = await ctx.db.query('progressUpdates').collect();
        const userUpdates = allUpdates.filter(pu => objectiveIds.includes(pu.objective));

        const { calculateUserStreakInternal } = await import('../achievements_utils/calculations');
        const streak = await calculateUserStreakInternal(ctx, userId);

        const earlyCompletions = completedObjectives.filter(o => {
          if (!o.deadline) return false;
          return o.updatedAt <= o.deadline;
        }).length;

        return {
          totalObjectives: objectives.length,
          completedObjectives: completedObjectives.length,
          totalProgressUpdates: userUpdates.length,
          streak,
          earlyCompletions,
        };
      });

    // Check each category directly (implementing the logic inline)
    const categories = ['objectives_created', 'objectives_completed', 'streak', 'progress_updates', 'early_bird'] as const;
    const allAwarded: string[] = [];

    for (const category of categories) {
      // Get achievement definitions for this category
      const allDefinitions = await ctx.db.query('achievementDefinitions').collect();
      const categoryDefinitions = allDefinitions.filter(
        d => d.isActive && d.type === 'individual' && d.code.includes(category)
      );

      // Get already earned achievements
      const earnedAchievements = await ctx.db
        .query('obtainedAchievements')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

      const earnedCodes = new Set(
        await Promise.all(
          earnedAchievements.map(async ea => {
            const def = await ctx.db.get('achievementDefinitions', ea.achievement);
            return def?.code;
          })
        )
      );

      for (const def of categoryDefinitions) {
        if (earnedCodes.has(def.code)) continue;

        let shouldAward = false;

        // Evaluate based on category
        switch (category) {
          case 'objectives_created':
            const targetCreated = extractNumberFromCode(def.code);
            shouldAward = stats.totalObjectives >= targetCreated;
            break;
          case 'objectives_completed':
            const targetCompleted = extractNumberFromCode(def.code);
            shouldAward = stats.completedObjectives >= targetCompleted;
            break;
          case 'streak':
            const targetStreak = extractNumberFromCode(def.code);
            shouldAward = stats.streak >= targetStreak;
            break;
          case 'progress_updates':
            const targetUpdates = extractNumberFromCode(def.code);
            shouldAward = stats.totalProgressUpdates >= targetUpdates;
            break;
          case 'early_bird':
            shouldAward = stats.earlyCompletions >= 1;
            break;
        }

        if (shouldAward) {
          const now = Date.now();
          try {
            await ctx.db.insert('obtainedAchievements', {
              userId: userId,
              achievement: def._id,
              earnedAt: now,
              createdAt: now,
              updatedAt: now,
            });
            allAwarded.push(def.code);
          } catch {
            // Ignore duplicate insert errors
          }
        }
      }
    }

    return { awarded: allAwarded, stats };
  },
});
