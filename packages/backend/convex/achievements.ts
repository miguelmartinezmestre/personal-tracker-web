import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery, QueryCtx, MutationCtx } from './_generated/server';

// Achievement definitions data
const ACHIEVEMENT_DEFINITIONS = [
    // Individual - Milestone
    {
        code: 'first_objective',
        type: 'individual',
        category: 'milestone',
        tier: 'bronze',
        threshold: 1,
        icon: 'Trophy',
        points: 10,
    },
    {
        code: 'objectives_created_5',
        type: 'individual',
        category: 'milestone',
        tier: 'bronze',
        threshold: 5,
        icon: 'Target',
        points: 25,
    },
    {
        code: 'objectives_created_15',
        type: 'individual',
        category: 'milestone',
        tier: 'silver',
        threshold: 15,
        icon: 'Target',
        points: 50,
    },
    {
        code: 'objectives_created_30',
        type: 'individual',
        category: 'milestone',
        tier: 'gold',
        threshold: 30,
        icon: 'Target',
        points: 100,
    },
    // Individual - Completion
    {
        code: 'objectives_completed_3',
        type: 'individual',
        category: 'completion',
        tier: 'bronze',
        threshold: 3,
        icon: 'CheckCircle',
        points: 30,
    },
    {
        code: 'objectives_completed_10',
        type: 'individual',
        category: 'completion',
        tier: 'silver',
        threshold: 10,
        icon: 'CheckCircle',
        points: 75,
    },
    {
        code: 'objectives_completed_25',
        type: 'individual',
        category: 'completion',
        tier: 'gold',
        threshold: 25,
        icon: 'CheckCircle',
        points: 150,
    },
    // Individual - Streak
    {
        code: 'streak_3',
        type: 'individual',
        category: 'streak',
        tier: 'bronze',
        threshold: 3,
        icon: 'Flame',
        points: 20,
    },
    {
        code: 'streak_7',
        type: 'individual',
        category: 'streak',
        tier: 'silver',
        threshold: 7,
        icon: 'Flame',
        points: 50,
    },
    {
        code: 'streak_14',
        type: 'individual',
        category: 'streak',
        tier: 'gold',
        threshold: 14,
        icon: 'Flame',
        points: 100,
    },
    // Individual - Activity
    {
        code: 'progress_updates_10',
        type: 'individual',
        category: 'activity',
        tier: 'bronze',
        threshold: 10,
        icon: 'TrendingUp',
        points: 15,
    },
    {
        code: 'progress_updates_50',
        type: 'individual',
        category: 'activity',
        tier: 'silver',
        threshold: 50,
        icon: 'TrendingUp',
        points: 40,
    },
    {
        code: 'progress_updates_100',
        type: 'individual',
        category: 'activity',
        tier: 'gold',
        threshold: 100,
        icon: 'TrendingUp',
        points: 80,
    },
    // Individual - Special
    {
        code: 'early_bird',
        type: 'individual',
        category: 'completion',
        tier: 'silver',
        threshold: 1,
        icon: 'Clock',
        points: 40,
    },
    // Team achievements
    {
        code: 'team_first_objective',
        type: 'team',
        category: 'milestone',
        tier: 'bronze',
        threshold: 1,
        icon: 'Users',
        points: 15,
    },
    {
        code: 'team_completed_5',
        type: 'team',
        category: 'completion',
        tier: 'bronze',
        threshold: 5,
        icon: 'Users',
        points: 50,
    },
    {
        code: 'team_completed_15',
        type: 'team',
        category: 'completion',
        tier: 'silver',
        threshold: 15,
        icon: 'Users',
        points: 100,
    },
    {
        code: 'team_completed_30',
        type: 'team',
        category: 'completion',
        tier: 'gold',
        threshold: 30,
        icon: 'Users',
        points: 200,
    },
    {
        code: 'team_streak_7',
        type: 'team',
        category: 'streak',
        tier: 'silver',
        threshold: 7,
        icon: 'Flame',
        points: 75,
    },
];

// ============ QUERIES ============

export const getAchievementDefinitions = queryWithRLS({
    args: {
        type: v.optional(v.string()),
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
        const userId = String(ctx.identity?.subject);

        const userAchievements = await ctx.db
            .query('userAchievements')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        // Get achievement definitions for each earned achievement
        const achievementsWithDetails = await Promise.all(
            userAchievements.map(async ua => {
                const definition = await ctx.db.get(ua.achievement);
                return {
                    ...ua,
                    definition,
                };
            })
        );

        return achievementsWithDetails;
    },
});

export const getTeamAchievements = queryWithRLS({
    args: {
        teamId: v.string(),
    },
    handler: async (ctx, args) => {
        const teamAchievements = await ctx.db
            .query('teamAchievements')
            .withIndex('by_team', q => q.eq('team', args.teamId))
            .collect();

        const achievementsWithDetails = await Promise.all(
            teamAchievements.map(async ta => {
                const definition = await ctx.db.get(ta.achievement);
                return {
                    ...ta,
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
        const userId = String(ctx.identity?.subject);

        const userAchievements = await ctx.db
            .query('userAchievements')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        let totalPoints = 0;
        for (const ua of userAchievements) {
            const definition = await ctx.db.get(ua.achievement);
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
            earnedCount: userAchievements.length,
            totalAvailable: individualDefinitions.length,
        };
    },
});

export const getRecentAchievements = queryWithRLS({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = String(ctx.identity?.subject);
        const limit = args.limit ?? 5;

        const userAchievements = await ctx.db
            .query('userAchievements')
            .withIndex('by_user', q => q.eq('user', userId))
            .order('desc')
            .take(limit);

        const achievementsWithDetails = await Promise.all(
            userAchievements.map(async ua => {
                const definition = await ctx.db.get(ua.achievement);
                return {
                    ...ua,
                    definition,
                };
            })
        );

        return achievementsWithDetails;
    },
});

export const getUserAchievementProgress = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);

        // Get all active individual achievement definitions
        const definitions = await ctx.db
            .query('achievementDefinitions')
            .withIndex('by_type', q => q.eq('type', 'individual'))
            .collect();

        const activeDefinitions = definitions.filter(d => d.isActive);

        // Get user's earned achievements
        const earnedAchievements = await ctx.db
            .query('userAchievements')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const earnedIds = new Set(earnedAchievements.map(ea => String(ea.achievement)));

        // Calculate progress for each achievement
        const objectivesCount = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const completedObjectives = objectivesCount.filter(o => o.status === 'completed');

        const progressUpdates = await ctx.db.query('progressUpdates').collect();

        // Filter progress updates for user's objectives
        const userObjectiveIds = new Set(objectivesCount.map(o => String(o._id)));
        const userProgressUpdates = progressUpdates.filter(pu =>
            userObjectiveIds.has(String(pu.objective))
        );

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
                    ? earnedAchievements.find(ea => String(ea.achievement) === String(def._id))
                          ?.earnedAt
                    : undefined,
            };
        });

        return progressList;
    },
});

// Helper function to calculate user streak
async function calculateUserStreak(ctx: { db: QueryCtx['db'] }, userId: string): Promise<number> {
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user', q => q.eq('user', userId))
        .collect();

    const objectiveIds = objectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const allUpdates = await ctx.db.query('progressUpdates').collect();

    const userUpdates = allUpdates
        .filter((pu: Doc<'progressUpdates'>) => objectiveIds.includes(pu.objective))
        .sort(
            (a: Doc<'progressUpdates'>, b: Doc<'progressUpdates'>) => b.updateDate - a.updateDate
        );

    if (userUpdates.length === 0) return 0;

    const DAY_MS = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Get unique days with activity
    const activityDays = new Set<number>();
    for (const update of userUpdates) {
        const dayStart = new Date(update.updateDate);
        dayStart.setHours(0, 0, 0, 0);
        activityDays.add(dayStart.getTime());
    }

    const sortedDays = Array.from(activityDays).sort((a, b) => b - a);

    // Check if there's activity today or yesterday (to maintain streak)
    const mostRecentDay = sortedDays[0];
    if (mostRecentDay < todayMs - DAY_MS) {
        return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 0;
    let expectedDay = mostRecentDay;

    for (const day of sortedDays) {
        if (day === expectedDay) {
            streak++;
            expectedDay -= DAY_MS;
        } else if (day < expectedDay) {
            break; // Gap in streak
        }
    }

    return streak;
}

// ============ MUTATIONS ============

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
            .query('userAchievements')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const earnedCodes = new Set(
            await Promise.all(
                earnedAchievements.map(async ea => {
                    const def = await ctx.db.get(ea.achievement);
                    return def?.code;
                })
            )
        );

        // Get current stats
        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const completedObjectives = objectives.filter(o => o.status === 'completed');

        const objectiveIds = objectives.map(o => o._id);
        const allUpdates = await ctx.db.query('progressUpdates').collect();
        const userUpdates = allUpdates.filter(pu => objectiveIds.includes(pu.objective));

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
                    shouldAward =
                        trigger === 'objective_completed' && completedObjectives.length >= 3;
                    break;
                case 'objectives_completed_10':
                    shouldAward =
                        trigger === 'objective_completed' && completedObjectives.length >= 10;
                    break;
                case 'objectives_completed_25':
                    shouldAward =
                        trigger === 'objective_completed' && completedObjectives.length >= 25;
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
                // Award the achievement
                await ctx.db.insert('userAchievements', {
                    user: userId,
                    achievement: def._id,
                    earnedAt: now,
                    createdAt: now,
                    updatedAt: now,
                });

                // Create notification
                await ctx.db.insert('notifications', {
                    user: userId,
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

// Internal helper for streak calculation (without RLS context)
async function calculateUserStreakInternal(
    ctx: { db: MutationCtx['db'] },
    userId: string
): Promise<number> {
    const objectives = await ctx.db
        .query('objectives')
        .withIndex('by_user', q => q.eq('user', userId))
        .collect();

    const objectiveIds = objectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const allUpdates = await ctx.db.query('progressUpdates').collect();

    const userUpdates = allUpdates
        .filter((pu: Doc<'progressUpdates'>) => objectiveIds.includes(pu.objective))
        .sort(
            (a: Doc<'progressUpdates'>, b: Doc<'progressUpdates'>) => b.updateDate - a.updateDate
        );

    if (userUpdates.length === 0) return 0;

    const DAY_MS = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const activityDays = new Set<number>();
    for (const update of userUpdates) {
        const dayStart = new Date(update.updateDate);
        dayStart.setHours(0, 0, 0, 0);
        activityDays.add(dayStart.getTime());
    }

    const sortedDays = Array.from(activityDays).sort((a, b) => b - a);

    const mostRecentDay = sortedDays[0];
    if (mostRecentDay < todayMs - DAY_MS) {
        return 0;
    }

    let streak = 0;
    let expectedDay = mostRecentDay;

    for (const day of sortedDays) {
        if (day === expectedDay) {
            streak++;
            expectedDay -= DAY_MS;
        } else if (day < expectedDay) {
            break;
        }
    }

    return streak;
}

// Check team achievements
export const checkTeamAchievements = internalMutation({
    args: {
        teamId: v.string(),
        userId: v.string(),
        trigger: v.string(),
    },
    handler: async (ctx, args) => {
        const { teamId, userId, trigger } = args;
        const now = Date.now();

        // Get team achievement definitions
        const definitions = await ctx.db
            .query('achievementDefinitions')
            .withIndex('by_type', q => q.eq('type', 'team'))
            .collect();

        const activeDefinitions = definitions.filter(d => d.isActive);

        // Get team's already earned achievements
        const earnedAchievements = await ctx.db
            .query('teamAchievements')
            .withIndex('by_team', q => q.eq('team', teamId))
            .collect();

        const earnedCodes = new Set(
            await Promise.all(
                earnedAchievements.map(async ea => {
                    const def = await ctx.db.get(ea.achievement);
                    return def?.code;
                })
            )
        );

        // Get team members
        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', teamId))
            .collect();

        const memberUserIds = members.map(m => m.userId);

        // Get all objectives from team members
        const allObjectives = await ctx.db.query('objectives').collect();
        const teamObjectives = allObjectives.filter(o => memberUserIds.includes(o.user));
        const completedTeamObjectives = teamObjectives.filter(o => o.status === 'completed');

        const newAchievements: string[] = [];

        for (const def of activeDefinitions) {
            if (earnedCodes.has(def.code)) continue;

            let shouldAward = false;

            switch (def.code) {
                case 'team_first_objective':
                    shouldAward = trigger === 'objective_created' && teamObjectives.length >= 1;
                    break;
                case 'team_completed_5':
                    shouldAward =
                        trigger === 'objective_completed' && completedTeamObjectives.length >= 5;
                    break;
                case 'team_completed_15':
                    shouldAward =
                        trigger === 'objective_completed' && completedTeamObjectives.length >= 15;
                    break;
                case 'team_completed_30':
                    shouldAward =
                        trigger === 'objective_completed' && completedTeamObjectives.length >= 30;
                    break;
                case 'team_streak_7':
                    // Check if team has had activity for 7 consecutive days
                    const teamStreak = await calculateTeamStreak(ctx, memberUserIds);
                    shouldAward = trigger === 'progress_update' && teamStreak >= 7;
                    break;
            }

            if (shouldAward) {
                await ctx.db.insert('teamAchievements', {
                    team: teamId,
                    achievement: def._id,
                    earnedAt: now,
                    contributingUsers: [userId],
                    createdAt: now,
                    updatedAt: now,
                });

                // Notify all team members
                for (const member of members) {
                    await ctx.db.insert('notifications', {
                        user: member.userId,
                        objective: undefined,
                        read: false,
                        notificationType: 'achievement',
                        notificationDate: now,
                        message: `Team achievement unlocked: "${def.code}"! The team earned ${def.points} points.`,
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

async function calculateTeamStreak(ctx: any, memberUserIds: string[]): Promise<number> {
    const allObjectives = await ctx.db.query('objectives').collect();
    const teamObjectives = allObjectives.filter((o: Doc<'objectives'>) =>
        memberUserIds.includes(o.user)
    );
    const objectiveIds = teamObjectives.map((o: Doc<'objectives'>) => o._id);

    if (objectiveIds.length === 0) return 0;

    const allUpdates = await ctx.db.query('progressUpdates').collect();
    const teamUpdates = allUpdates
        .filter((pu: Doc<'progressUpdates'>) => objectiveIds.includes(pu.objective))
        .sort(
            (a: Doc<'progressUpdates'>, b: Doc<'progressUpdates'>) => b.updateDate - a.updateDate
        );

    if (teamUpdates.length === 0) return 0;

    const DAY_MS = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const activityDays = new Set<number>();
    for (const update of teamUpdates) {
        const dayStart = new Date(update.updateDate);
        dayStart.setHours(0, 0, 0, 0);
        activityDays.add(dayStart.getTime());
    }

    const sortedDays = Array.from(activityDays).sort((a, b) => b - a);

    const mostRecentDay = sortedDays[0];
    if (mostRecentDay < todayMs - DAY_MS) {
        return 0;
    }

    let streak = 0;
    let expectedDay = mostRecentDay;

    for (const day of sortedDays) {
        if (day === expectedDay) {
            streak++;
            expectedDay -= DAY_MS;
        } else if (day < expectedDay) {
            break;
        }
    }

    return streak;
}

// Get unviewed achievements count (for sidebar indicator)
export const getUnviewedAchievementsCount = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.identity?.subject);

        // Get unread achievement notifications
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user', q => q.eq('user', userId))
            .collect();

        const unreadAchievementNotifications = notifications.filter(
            n => n.notificationType === 'achievement' && !n.read
        );

        return unreadAchievementNotifications.length;
    },
});
