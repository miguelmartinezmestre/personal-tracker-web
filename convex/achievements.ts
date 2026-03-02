import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import {
  calculateUserStreak,
  calculateUserStreakInternal,
  calculateOrganizationStreak,
} from './achievements_utils/calculations';
import { queryWithRLS, mutationWithRLS } from './rls';
import { ACHIEVEMENT_DEFINITIONS } from './utils/achievements';
import { achievementTypeValidator } from './utils/validators';

export const getAchievementDefinitions = queryWithRLS({
  args: {
    type: v.optional(achievementTypeValidator),
  },
  handler: async (ctx, args) => {
    const typeFilter = args.type;

    if (typeFilter) {
      const definitions = await ctx.db
        .query('achievementDefinitions')
        .withIndex('by_type', q => q.eq('type', typeFilter))
        .collect();
      return definitions.filter(d => d.isActive);
    }

    const definitions = await ctx.db.query('achievementDefinitions').collect();
    return definitions.filter(d => d.isActive);
  },
});

export const getUserAchievements = queryWithRLS({
  args: {},
  handler: async ctx => {
    const userId = String(ctx.userId);

    const obtainedAchievements = await ctx.db
      .query('obtainedAchievements')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    // Get achievement definitions for each earned achievement
    const achievementsWithDetails = await Promise.all(
      obtainedAchievements.map(async oa => {
        const definition = await ctx.db.get('achievementDefinitions', oa.achievement);
        return {
          ...oa,
          definition,
          user: oa.userId,
        };
      })
    );

    return achievementsWithDetails;
  },
});

export const getOrganizationAchievements = queryWithRLS({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const organizationAchievements = await ctx.db
      .query('organizationAchievements')
      .withIndex('by_organization', q => q.eq('organization', args.organizationId))
      .collect();

    const achievementsWithDetails = await Promise.all(
      organizationAchievements.map(async oa => {
        const definition = await ctx.db.get('achievementDefinitions', oa.achievement);
        return {
          ...oa,
          definition,
        };
      })
    );

    return achievementsWithDetails;
  },
});

export const getUserAchievementStats = queryWithRLS({
  args: {},
  handler: async ctx => {
    const userId = String(ctx.userId);

    const obtainedAchievements = await ctx.db
      .query('obtainedAchievements')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    let totalPoints = 0;
    for (const oa of obtainedAchievements) {
      const definition = await ctx.db.get('achievementDefinitions', oa.achievement);
      if (definition) {
        totalPoints += definition.points;
      }
    }

    const allDefinitions = await ctx.db
      .query('achievementDefinitions')
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();

    const individualDefinitions = allDefinitions.filter(d => d.type === 'individual');

    return {
      totalPoints,
      earnedCount: obtainedAchievements.length,
      totalAvailable: individualDefinitions.length,
    };
  },
});

export const getRecentAchievements = queryWithRLS({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = String(ctx.userId);
    const limit = args.limit ?? 5;

    const obtainedAchievements = await ctx.db
      .query('obtainedAchievements')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);

    const achievementsWithDetails = await Promise.all(
      obtainedAchievements.map(async oa => {
        const definition = await ctx.db.get('achievementDefinitions', oa.achievement);
        return definition;
      })
    );

    return achievementsWithDetails;
  },
});

export const getUserAchievementProgress = queryWithRLS({
  args: {},
  handler: async ctx => {
    const userId = String(ctx.userId);

    // Get all active individual achievement definitions
    const definitions = await ctx.db
      .query('achievementDefinitions')
      .withIndex('by_type', q => q.eq('type', 'individual'))
      .collect();

    const activeDefinitions = definitions.filter(d => d.isActive);

    // Get user's earned achievements
    const obtainedAchievements = await ctx.db
      .query('obtainedAchievements')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const earnedIds = new Set(obtainedAchievements.map(oa => String(oa.achievement)));

    // Calculate progress for each achievement
    const objectivesCount = await ctx.db
      .query('objectives')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const completedObjectives = objectivesCount.filter(o => o.status === 'completed');

    // Collect progress updates for each objective using indexed queries
    const userObjectiveIds = objectivesCount.map(o => o._id);
    const userProgressUpdates = await Promise.all(
      userObjectiveIds.map(async objectiveId => {
        const updates = await ctx.db
          .query('progressUpdates')
          .withIndex('by_objective', q => q.eq('objective', objectiveId))
          .collect();
        return updates;
      })
    ).then(results => results.flat());

    // Calculate streak (simplified - consecutive days with progress)
    const streak = await calculateUserStreak(ctx, userId);

    const progressList = activeDefinitions.map(def => {
      const isEarned = earnedIds.has(String(def._id));
      let currentProgress = 0;

      switch (def.code) {
        case 'first_objective':
        case 'objectives_created_5':
        case 'objectives_created_15':
        case 'objectives_created_30':
          currentProgress = objectivesCount.length;
          break;
        case 'objectives_completed_3':
        case 'objectives_completed_10':
        case 'objectives_completed_25':
          currentProgress = completedObjectives.length;
          break;
        case 'streak_3':
        case 'streak_7':
        case 'streak_14':
          currentProgress = streak;
          break;
        case 'progress_updates_10':
        case 'progress_updates_50':
        case 'progress_updates_100':
          currentProgress = userProgressUpdates.length;
          break;
        case 'early_bird':
          // Count objectives completed before deadline
          currentProgress = completedObjectives.filter(o => {
            if (!o.deadline) return false;
            return o.updatedAt <= o.deadline;
          }).length;
          break;
      }

      return {
        definition: def,
        currentProgress,
        isEarned,
        earnedAt: isEarned
          ? obtainedAchievements.find(oa => String(oa.achievement) === String(def._id))?.earnedAt
          : undefined,
      };
    });

    return progressList;
  },
});

export const getUnviewedAchievementsCount = queryWithRLS({
  args: {},
  handler: async ctx => {
    const userId = String(ctx.userId);

    // Get unread achievement notifications
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_type_read', q =>
        q.eq('userId', userId).eq('notificationType', 'achievement').eq('read', false)
      )
      .collect();

    return notifications.length;
  },
});

export const seedAchievementDefinitions = mutationWithRLS({
  args: {},
  handler: async ctx => {
    const now = Date.now();

    // Check if already seeded
    const existing = await ctx.db.query('achievementDefinitions').first();
    if (existing) {
      return { message: 'Achievements already seeded', count: 0 };
    }

    let count = 0;
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await ctx.db.insert('achievementDefinitions', {
        ...def,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { message: 'Achievements seeded successfully', count };
  },
});

// Internal mutation to check and award achievements (called from other mutations)
export const checkUserAchievements = internalMutation({
  args: {
    userId: v.string(),
    trigger: v.string(), // 'objective_created' | 'objective_completed' | 'progress_update'
  },
  handler: async (ctx, args) => {
    const { userId, trigger } = args;
    const now = Date.now();

    // Get all individual achievement definitions
    const definitions = await ctx.db
      .query('achievementDefinitions')
      .withIndex('by_type', q => q.eq('type', 'individual'))
      .collect();

    const activeDefinitions = definitions.filter(d => d.isActive);

    // Get user's already earned achievements
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

    // Get current stats
    const objectives = await ctx.db
      .query('objectives')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const completedObjectives = objectives.filter(o => o.status === 'completed');

    const objectiveIds = objectives.map(o => o._id);
    const userUpdates = await Promise.all(
      objectiveIds.map(async objectiveId => {
        const updates = await ctx.db
          .query('progressUpdates')
          .withIndex('by_objective', q => q.eq('objective', objectiveId))
          .collect();
        return updates;
      })
    ).then(results => results.flat());

    const streak = await calculateUserStreakInternal(ctx, userId);

    const newAchievements: string[] = [];

    for (const def of activeDefinitions) {
      if (earnedCodes.has(def.code)) continue;

      let shouldAward = false;

      switch (def.code) {
        case 'first_objective':
          shouldAward = trigger === 'objective_created' && objectives.length >= 1;
          break;
        case 'objectives_created_5':
          shouldAward = trigger === 'objective_created' && objectives.length >= 5;
          break;
        case 'objectives_created_15':
          shouldAward = trigger === 'objective_created' && objectives.length >= 15;
          break;
        case 'objectives_created_30':
          shouldAward = trigger === 'objective_created' && objectives.length >= 30;
          break;
        case 'objectives_completed_3':
          shouldAward = trigger === 'objective_completed' && completedObjectives.length >= 3;
          break;
        case 'objectives_completed_10':
          shouldAward = trigger === 'objective_completed' && completedObjectives.length >= 10;
          break;
        case 'objectives_completed_25':
          shouldAward = trigger === 'objective_completed' && completedObjectives.length >= 25;
          break;
        case 'streak_3':
          shouldAward = trigger === 'progress_update' && streak >= 3;
          break;
        case 'streak_7':
          shouldAward = trigger === 'progress_update' && streak >= 7;
          break;
        case 'streak_14':
          shouldAward = trigger === 'progress_update' && streak >= 14;
          break;
        case 'progress_updates_10':
          shouldAward = trigger === 'progress_update' && userUpdates.length >= 10;
          break;
        case 'progress_updates_50':
          shouldAward = trigger === 'progress_update' && userUpdates.length >= 50;
          break;
        case 'progress_updates_100':
          shouldAward = trigger === 'progress_update' && userUpdates.length >= 100;
          break;
        case 'early_bird':
          if (trigger === 'objective_completed') {
            const earlyCompletions = completedObjectives.filter(o => {
              if (!o.deadline) return false;
              return o.updatedAt <= o.deadline;
            });
            shouldAward = earlyCompletions.length >= 1;
          }
          break;
      }

      if (shouldAward) {
        // Double-check dedup at insert time to prevent race conditions
        const alreadyAwarded = await ctx.db
          .query('obtainedAchievements')
          .withIndex('by_user_achievement', q => q.eq('userId', userId).eq('achievement', def._id))
          .first();

        if (alreadyAwarded) continue;

        // Award the achievement
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
          organizationId: '',
          objective: undefined,
          read: false,
          notificationType: 'achievement',
          notificationDate: now,
          message: `Achievement unlocked: "${def.code}"! You earned ${def.points} points.`,
          createdAt: now,
          updatedAt: now,
        });

        newAchievements.push(def.code);
      }
    }

    return { awarded: newAchievements };
  },
});

// Check organization achievements
export const checkOrganizationAchievements = internalMutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    trigger: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, userId, trigger } = args;
    const now = Date.now();

    // Get organization achievement definitions
    const definitions = await ctx.db
      .query('achievementDefinitions')
      .withIndex('by_type', q => q.eq('type', 'organization'))
      .collect();

    const activeDefinitions = definitions.filter(d => d.isActive);

    // Get organization's already earned achievements
    const earnedAchievements = await ctx.db
      .query('organizationAchievements')
      .withIndex('by_organization', q => q.eq('organization', organizationId))
      .collect();

    const earnedCodes = new Set(
      await Promise.all(
        earnedAchievements.map(async ea => {
          const def = await ctx.db.get('achievementDefinitions', ea.achievement);
          return def?.code;
        })
      )
    );

    const members = await ctx.db
      .query('member')
      .withIndex('organizationId', q => q.eq('organizationId', organizationId))
      .collect();

    const memberUserIds = members.map(m => m.userId);

    // Get objectives from organization members using indexed queries per user
    const organizationObjectives = await Promise.all(
      memberUserIds.map(async memberId => {
        const userObjectives = await ctx.db
          .query('objectives')
          .withIndex('by_user', q => q.eq('userId', memberId))
          .collect();
        return userObjectives;
      })
    ).then(results => results.flat());

    const completedOrganizationObjectives = organizationObjectives.filter(
      o => o.status === 'completed'
    );

    const newAchievements: string[] = [];

    for (const def of activeDefinitions) {
      if (earnedCodes.has(def.code)) continue;

      let shouldAward = false;

      switch (def.code) {
        case 'organization_first_objective':
          shouldAward = trigger === 'objective_created' && organizationObjectives.length >= 1;
          break;
        case 'organization_completed_5':
          shouldAward =
            trigger === 'objective_completed' && completedOrganizationObjectives.length >= 5;
          break;
        case 'organization_completed_15':
          shouldAward =
            trigger === 'objective_completed' && completedOrganizationObjectives.length >= 15;
          break;
        case 'organization_completed_30':
          shouldAward =
            trigger === 'objective_completed' && completedOrganizationObjectives.length >= 30;
          break;
        case 'organization_streak_7': {
          // Check if organization has had activity for 7 consecutive days
          const organizationStreak = await calculateOrganizationStreak(ctx, memberUserIds);
          shouldAward = trigger === 'progress_update' && organizationStreak >= 7;
          break;
        }
      }

      if (shouldAward) {
        // Double-check dedup at insert time to prevent race conditions
        const alreadyAwarded = await ctx.db
          .query('organizationAchievements')
          .withIndex('by_organization_achievement', q =>
            q.eq('organization', organizationId).eq('achievement', def._id)
          )
          .first();

        if (alreadyAwarded) continue;

        await ctx.db.insert('organizationAchievements', {
          organization: organizationId,
          achievement: def._id,
          earnedAt: now,
          contributingUsers: [userId],
          createdAt: now,
          updatedAt: now,
        });

        // Notify all organization members
        for (const member of members) {
          await ctx.db.insert('notifications', {
            userId: member.userId,
            organizationId: organizationId,
            objective: undefined,
            read: false,
            notificationType: 'achievement',
            notificationDate: now,
            message: `Organization achievement unlocked: "${def.code}"! The organization earned ${def.points} points.`,
            createdAt: now,
            updatedAt: now,
          });
        }

        newAchievements.push(def.code);
      }
    }

    return { awarded: newAchievements };
  },
});
