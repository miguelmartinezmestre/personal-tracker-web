import { v, ConvexError } from 'convex/values';
import type { GenericMutationCtx } from 'convex/server';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import type { DataModel, Id } from './_generated/dataModel';
import {
    calculateUserStreak,
    calculateOrganizationStreak,
} from './achievements_utils/calculations';
import { queryWithRLS, mutationWithRLS } from './rls';
import { ACHIEVEMENT_DEFINITIONS } from './utils/achievements';
import { achievementTypeValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';

async function shouldSendAchievementNotification(
    ctx: GenericMutationCtx<DataModel>,
    userId: Id<'user'>
): Promise<boolean> {
    const preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (!preferences) {
        return true;
    }

    return preferences.achievementNotifications ?? true;
}

async function shouldSendOrganizationNotification(
    ctx: GenericMutationCtx<DataModel>,
    userId: Id<'user'>
): Promise<boolean> {
    const preferences = await ctx.db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .first();

    if (!preferences) {
        return true;
    }

    return preferences.organizationNotifications ?? true;
}

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
        const userId = ctx.userId;

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const definitions = await ctx.db.query('achievementDefinitions').collect();
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const achievementsWithDetails = obtainedAchievements.map(oa => ({
            ...oa,
            definition: defMap.get(oa.achievement),
            user: oa.userId,
        }));

        return achievementsWithDetails;
    },
});

export const getOrganizationAchievements = queryWithRLS({
    args: {
        organizationId: v.id('organization'),
    },
    handler: async (ctx, args) => {
        const organizationAchievements = await ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization', q => q.eq('organization', args.organizationId))
            .collect();

        const definitions = await ctx.db.query('achievementDefinitions').collect();
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const achievementsWithDetails = organizationAchievements.map(oa => ({
            ...oa,
            definition: defMap.get(oa.achievement),
        }));

        return achievementsWithDetails;
    },
});

export const getUserAchievementStats = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const allDefinitions = await ctx.db.query('achievementDefinitions').collect();
        const defMap = new Map(allDefinitions.map(d => [d._id, d]));

        let totalPoints = 0;
        for (const oa of obtainedAchievements) {
            const definition = defMap.get(oa.achievement);
            if (definition) {
                totalPoints += definition.points;
            }
        }

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
        const userId = ctx.userId;
        const limit = args.limit ?? 5;

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .order('desc')
            .take(limit);

        const definitions = await ctx.db.query('achievementDefinitions').collect();
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const achievementsWithDetails = obtainedAchievements
            .map(oa => defMap.get(oa.achievement))
            .filter((def): def is NonNullable<typeof def> => def !== null);

        return achievementsWithDetails;
    },
});

export const getUserAchievementProgress = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const definitions = await ctx.db
            .query('achievementDefinitions')
            .withIndex('by_type', q => q.eq('type', 'individual'))
            .collect();

        const activeDefinitions = definitions.filter(d => d.isActive);

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const earnedIds = new Set(obtainedAchievements.map(oa => oa.achievement));

        const objectivesCount = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const completedObjectives = objectivesCount.filter(o => o.status === 'completed');

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

        const streak = await calculateUserStreak(ctx, userId);

        const progressList = activeDefinitions.map(def => {
            const isEarned = earnedIds.has(def._id);
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
                    ? obtainedAchievements.find(oa => oa.achievement === def._id)?.earnedAt
                    : undefined,
            };
        });

        return progressList;
    },
});

export const getUnviewedAchievementsCount = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_type_read', q =>
                q.eq('userId', userId).eq('notificationType', 'achievement').eq('read', false)
            )
            .collect();

        return notifications.length;
    },
});

export const seedAchievementDefinitionsInternal = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

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

export const seedAchievementDefinitions = mutationWithRLS({
    args: {},
    handler: async (ctx): Promise<{ message: string; count: number }> => {
        return await ctx.runMutation(internal.achievements.seedAchievementDefinitionsInternal, {});
    },
});

type MutationCtx = GenericMutationCtx<DataModel>;

type EvaluateAndAwardParams = {
    ctx: MutationCtx;
    scopeType: 'individual' | 'organization';
    evaluate: (code: string) => Promise<boolean> | boolean;
    award: (defId: Id<'achievementDefinitions'>, code: string, points: number) => Promise<void>;
};

async function evaluateAndAwardAchievements(params: EvaluateAndAwardParams) {
    const { ctx, scopeType, evaluate, award } = params;

    const definitions = await ctx.db
        .query('achievementDefinitions')
        .withIndex('by_type', q => q.eq('type', scopeType))
        .collect();

    const activeDefinitions = definitions.filter(d => d.isActive);

    const newAchievements: string[] = [];

    for (const def of activeDefinitions) {
        const shouldAward = await evaluate(def.code);
        if (shouldAward) {
            await award(def._id, def.code, def.points);
            newAchievements.push(def.code);
        }
    }

    return { awarded: newAchievements };
}

export const checkUserAchievements = internalMutation({
    args: {
        userId: v.id('user'),
        organizationId: v.optional(v.id('organization')),
        trigger: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId, organizationId, trigger } = args;
        const now = Date.now();
        if (!organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }

        const earnedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();

        const definitions = await ctx.db.query('achievementDefinitions').collect();
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const earnedCodes = new Set(
            earnedAchievements.map(ea => defMap.get(ea.achievement)?.code).filter(Boolean)
        );

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

        const streak = await calculateUserStreak(ctx, userId);

        return evaluateAndAwardAchievements({
            ctx,
            scopeType: 'individual',
            evaluate(code) {
                if (earnedCodes.has(code)) return false;

                switch (code) {
                    case 'first_objective':
                        return trigger === 'objective_created' && objectives.length >= 1;
                    case 'objectives_created_5':
                        return trigger === 'objective_created' && objectives.length >= 5;
                    case 'objectives_created_15':
                        return trigger === 'objective_created' && objectives.length >= 15;
                    case 'objectives_created_30':
                        return trigger === 'objective_created' && objectives.length >= 30;
                    case 'objectives_completed_3':
                        return trigger === 'objective_completed' && completedObjectives.length >= 3;
                    case 'objectives_completed_10':
                        return (
                            trigger === 'objective_completed' && completedObjectives.length >= 10
                        );
                    case 'objectives_completed_25':
                        return (
                            trigger === 'objective_completed' && completedObjectives.length >= 25
                        );
                    case 'streak_3':
                        return trigger === 'progress_update' && streak >= 3;
                    case 'streak_7':
                        return trigger === 'progress_update' && streak >= 7;
                    case 'streak_14':
                        return trigger === 'progress_update' && streak >= 14;
                    case 'progress_updates_10':
                        return trigger === 'progress_update' && userUpdates.length >= 10;
                    case 'progress_updates_50':
                        return trigger === 'progress_update' && userUpdates.length >= 50;
                    case 'progress_updates_100':
                        return trigger === 'progress_update' && userUpdates.length >= 100;
                    case 'early_bird':
                        if (trigger === 'objective_completed') {
                            const earlyCompletions = completedObjectives.filter(o => {
                                if (!o.deadline) return false;
                                return o.updatedAt <= o.deadline;
                            });
                            return earlyCompletions.length >= 1;
                        }
                        return false;
                    default:
                        return false;
                }
            },
            async award(defId, code, points) {
                const alreadyAwarded = await ctx.db
                    .query('obtainedAchievements')
                    .withIndex('by_user_achievement', q =>
                        q.eq('userId', userId).eq('achievement', defId)
                    )
                    .first();

                if (alreadyAwarded) return;

                await ctx.db.insert('obtainedAchievements', {
                    userId: userId,
                    achievement: defId,
                    earnedAt: now,
                    createdAt: now,
                    updatedAt: now,
                });

                const shouldNotify = await shouldSendAchievementNotification(ctx, userId);
                if (shouldNotify) {
                    await ctx.db.insert('notifications', {
                        userId: userId,
                        organizationId,
                        objective: undefined,
                        read: false,
                        notificationType: 'achievement',
                        notificationDate: now,
                        message: `Achievement unlocked: "${code}"! You earned ${points} points.`,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            },
        });
    },
});

export const checkOrganizationAchievements = internalMutation({
    args: {
        organizationId: v.id('organization'),
        userId: v.id('user'),
        trigger: v.string(),
    },
    handler: async (ctx, args) => {
        const { organizationId, userId, trigger } = args;
        const now = Date.now();

        const earnedAchievements = await ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization', q => q.eq('organization', organizationId))
            .collect();

        const definitions = await ctx.db.query('achievementDefinitions').collect();
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const earnedCodes = new Set(
            earnedAchievements.map(ea => defMap.get(ea.achievement)?.code).filter(Boolean)
        );

        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .collect();

        const memberUserIds = members.map(m => m.userId as Id<'user'>);

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

        return evaluateAndAwardAchievements({
            ctx,
            scopeType: 'organization',
            async evaluate(code) {
                if (earnedCodes.has(code)) return false;

                switch (code) {
                    case 'organization_first_objective':
                        return (
                            trigger === 'objective_created' && organizationObjectives.length >= 1
                        );
                    case 'organization_completed_5':
                        return (
                            trigger === 'objective_completed' &&
                            completedOrganizationObjectives.length >= 5
                        );
                    case 'organization_completed_15':
                        return (
                            trigger === 'objective_completed' &&
                            completedOrganizationObjectives.length >= 15
                        );
                    case 'organization_completed_30':
                        return (
                            trigger === 'objective_completed' &&
                            completedOrganizationObjectives.length >= 30
                        );
                    case 'organization_streak_7': {
                        const organizationStreak = await calculateOrganizationStreak(
                            ctx,
                            memberUserIds
                        );
                        return trigger === 'progress_update' && organizationStreak >= 7;
                    }
                    default:
                        return false;
                }
            },
            async award(defId, code, points) {
                const alreadyAwarded = await ctx.db
                    .query('organizationAchievements')
                    .withIndex('by_organization_achievement', q =>
                        q.eq('organization', organizationId).eq('achievement', defId)
                    )
                    .first();

                if (alreadyAwarded) return;

                await ctx.db.insert('organizationAchievements', {
                    organization: organizationId,
                    achievement: defId,
                    earnedAt: now,
                    contributingUsers: [userId],
                    createdAt: now,
                    updatedAt: now,
                });

                for (const member of members) {
                    const shouldNotify = await shouldSendOrganizationNotification(
                        ctx,
                        member.userId as Id<'user'>
                    );
                    if (shouldNotify) {
                        await ctx.db.insert('notifications', {
                            userId: member.userId as Id<'user'>,
                            organizationId: organizationId,
                            objective: undefined,
                            read: false,
                            notificationType: 'achievement',
                            notificationDate: now,
                            message: `Organization achievement unlocked: "${code}"! The organization earned ${points} points.`,
                            createdAt: now,
                            updatedAt: now,
                        });
                    }
                }
            },
        });
    },
});
