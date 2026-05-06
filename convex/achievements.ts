import { v, ConvexError } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
    calculateUserStreak,
    calculateOrganizationStreak,
} from './achievements_utils/calculations';
import { addContributor, getContributors } from './achievements_utils/helpers';
import { queryWithRLS } from './rls';
import { ACHIEVEMENT_DEFINITIONS } from './utils/achievements';
import { achievementTypeValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import { getAuthUserIdentity } from 'better-convex/auth';
const LIST_LIMIT = 1000;
const BATCH_SIZE = 100;
const ACHIEVEMENT_BATCH_SIZE = 50;

async function shouldSendAchievementNotification(
    ctx: MutationCtx,
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
    ctx: MutationCtx,
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

async function notifyOrganizationAchievementUnlocked(
    ctx: MutationCtx,
    organizationId: Id<'organization'>,
    code: string,
    points: number,
    now: number
): Promise<void> {
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
        const page = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', organizationId))
            .paginate({ numItems: ACHIEVEMENT_BATCH_SIZE, cursor });

        for (const member of page.page) {
            const uid = member.userId as Id<'user'>;
            const shouldNotify = await shouldSendOrganizationNotification(ctx, uid);
            if (shouldNotify) {
                await ctx.db.insert('notifications', {
                    userId: uid,
                    organizationId,
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

        isDone = page.isDone;
        cursor = page.continueCursor;
    }
}

async function countProgressUpdatesForObjectives(
    ctx: MutationCtx,
    userId: Id<'user'>,
    objectiveIds: Id<'objectives'>[]
): Promise<number> {
    if (objectiveIds.length === 0) {
        return 0;
    }

    const objectiveIdsSet = new Set(objectiveIds);
    let total = 0;
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
        const page = await ctx.db
            .query('progressUpdates')
            .withIndex('by_user_date', q => q.eq('userId', userId))
            .paginate({ numItems: ACHIEVEMENT_BATCH_SIZE, cursor });

        total += page.page.filter(update => objectiveIdsSet.has(update.objective)).length;
        isDone = page.isDone;
        cursor = page.continueCursor;
    }

    return total;
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
                .take(LIST_LIMIT);
            return definitions.filter(d => d.isActive);
        }

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
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
            .take(LIST_LIMIT);

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
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
            .take(LIST_LIMIT);

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const achievementsWithDetails = organizationAchievements.map(oa => ({
            ...oa,
            definition: defMap.get(oa.achievement),
        }));

        return achievementsWithDetails;
    },
});

export const getOrganizationAchievementContributors = queryWithRLS({
    args: {
        organizationAchievementId: v.id('organizationAchievements'),
        maxResults: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxResults = args.maxResults ?? 100;

        const contributors = await getContributors(ctx, args.organizationAchievementId, maxResults);

        return contributors.map(user => ({
            userId: user._id,
            name: user.name,
            image: user.image,
        }));
    },
});

export const getUserAchievementStats = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        const allDefinitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
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

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
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
            .take(LIST_LIMIT);

        const activeDefinitions = definitions.filter(d => d.isActive);

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        const earnedIds = new Set(obtainedAchievements.map(oa => oa.achievement));

        const objectivesCount: Doc<'objectives'>[] = [];
        let objectiveCursor: string | null = null;
        let objectivesDone = false;

        if (ctx.organizationId) {
            while (!objectivesDone) {
                const page = await ctx.db
                    .query('objectives')
                    .withIndex('by_user_organization', q =>
                        q.eq('userId', userId).eq('organizationId', ctx.organizationId!)
                    )
                    .paginate({ numItems: ACHIEVEMENT_BATCH_SIZE, cursor: objectiveCursor });

                objectivesCount.push(...page.page);
                objectivesDone = page.isDone;
                objectiveCursor = page.continueCursor;
            }
        } else {
            while (!objectivesDone) {
                const page = await ctx.db
                    .query('objectives')
                    .withIndex('by_user_scope', q => q.eq('userId', userId).eq('scope', 'personal'))
                    .paginate({ numItems: ACHIEVEMENT_BATCH_SIZE, cursor: objectiveCursor });

                objectivesCount.push(...page.page);
                objectivesDone = page.isDone;
                objectiveCursor = page.continueCursor;
            }
        }

        const completedObjectives = objectivesCount.filter(o => o.status === 'completed');
        let progressUpdatesCount = 0;

        if (objectivesCount.length > 0) {
            const objectiveIdsSet = new Set(objectivesCount.map(objective => objective._id));
            let progressCursor: string | null = null;
            let progressDone = false;

            while (!progressDone) {
                const page = await ctx.db
                    .query('progressUpdates')
                    .withIndex('by_user_date', q => q.eq('userId', userId))
                    .paginate({ numItems: ACHIEVEMENT_BATCH_SIZE, cursor: progressCursor });

                progressUpdatesCount += page.page.filter(update =>
                    objectiveIdsSet.has(update.objective)
                ).length;
                progressDone = page.isDone;
                progressCursor = page.continueCursor;
            }
        }

        const streak = ctx.organizationId
            ? await calculateUserStreak(ctx, userId, ctx.organizationId)
            : 0;

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
                    currentProgress = progressUpdatesCount;
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
            .take(100);

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

export const seedAchievementDefinitions = mutation({
    args: {},
    handler: async (ctx): Promise<{ message: string; count: number }> => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const userId = identity.userId as Id<'user'>;

        await ctx.runQuery(internal.setup.requireAdminInternal, { userId });

        return await ctx.runMutation(internal.achievements.seedAchievementDefinitionsInternal, {});
    },
});

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
        .take(BATCH_SIZE);

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
        organizationId: v.id('organization'),
        trigger: v.string(),
        objectivesContinueCursor: v.optional(v.union(v.string(), v.null())),
        progressUpdatesCount: v.optional(v.number()),
        cumulativeObjectiveCount: v.optional(v.number()),
        cumulativeCompletedCount: v.optional(v.number()),
        cumulativeEarlyBirdCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, organizationId, trigger } = args;
        const now = Date.now();
        let progressUpdatesCount = args.progressUpdatesCount ?? 0;
        let cumulativeObjectiveCount = args.cumulativeObjectiveCount ?? 0;
        let cumulativeCompletedCount = args.cumulativeCompletedCount ?? 0;
        let cumulativeEarlyBirdCount = args.cumulativeEarlyBirdCount ?? 0;

        const membership = await ctx.db
            .query('member')
            .withIndex('by_organizationId_and_userId', q =>
                q.eq('organizationId', organizationId).eq('userId', userId)
            )
            .first();

        if (!membership) {
            throw new ConvexError(ERROR_CODES.FORBIDDEN);
        }

        const earnedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const earnedCodes = new Set(
            earnedAchievements.map(ea => defMap.get(ea.achievement)?.code).filter(Boolean)
        );

        const objectivesPage = await ctx.db
            .query('objectives')
            .withIndex('by_user', q => q.eq('userId', userId))
            .filter(q => q.eq(q.field('organizationId'), organizationId))
            .paginate({
                numItems: ACHIEVEMENT_BATCH_SIZE,
                cursor: args.objectivesContinueCursor ?? null,
            });

        const objectivesBatch = objectivesPage.page;
        cumulativeObjectiveCount += objectivesBatch.length;
        cumulativeCompletedCount += objectivesBatch.filter(o => o.status === 'completed').length;
        cumulativeEarlyBirdCount += objectivesBatch.filter(
            o => o.status === 'completed' && o.deadline != null && o.updatedAt <= o.deadline
        ).length;

        const objectiveIds = objectivesBatch.map(o => o._id);

        if (objectiveIds.length > 0) {
            progressUpdatesCount += await countProgressUpdatesForObjectives(
                ctx,
                userId,
                objectiveIds
            );
        }

        const streak = await calculateUserStreak(ctx, userId, organizationId);

        const result = await evaluateAndAwardAchievements({
            ctx,
            scopeType: 'individual',
            evaluate(code) {
                if (earnedCodes.has(code)) return false;

                switch (code) {
                    case 'first_objective':
                        return trigger === 'objective_created' && cumulativeObjectiveCount >= 1;
                    case 'objectives_created_5':
                        return trigger === 'objective_created' && cumulativeObjectiveCount >= 5;
                    case 'objectives_created_15':
                        return trigger === 'objective_created' && cumulativeObjectiveCount >= 15;
                    case 'objectives_created_30':
                        return trigger === 'objective_created' && cumulativeObjectiveCount >= 30;
                    case 'objectives_completed_3':
                        return trigger === 'objective_completed' && cumulativeCompletedCount >= 3;
                    case 'objectives_completed_10':
                        return trigger === 'objective_completed' && cumulativeCompletedCount >= 10;
                    case 'objectives_completed_25':
                        return trigger === 'objective_completed' && cumulativeCompletedCount >= 25;
                    case 'streak_3':
                        return trigger === 'progress_update' && streak >= 3;
                    case 'streak_7':
                        return trigger === 'progress_update' && streak >= 7;
                    case 'streak_14':
                        return trigger === 'progress_update' && streak >= 14;
                    case 'progress_updates_10':
                        return trigger === 'progress_update' && progressUpdatesCount >= 10;
                    case 'progress_updates_50':
                        return trigger === 'progress_update' && progressUpdatesCount >= 50;
                    case 'progress_updates_100':
                        return trigger === 'progress_update' && progressUpdatesCount >= 100;
                    case 'early_bird':
                        if (trigger === 'objective_completed') {
                            return cumulativeEarlyBirdCount >= 1;
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

        if (!objectivesPage.isDone) {
            await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
                userId,
                organizationId,
                trigger,
                objectivesContinueCursor: objectivesPage.continueCursor,
                progressUpdatesCount,
                cumulativeObjectiveCount,
                cumulativeCompletedCount,
                cumulativeEarlyBirdCount,
            });
            return {
                ...result,
                status: 'in_progress',
                processedBatch: objectivesBatch.length,
                cumulativeObjectiveCount,
                cumulativeCompletedCount,
            };
        }

        return { ...result, status: 'completed' };
    },
});

export const checkOrganizationAchievements = internalMutation({
    args: {
        organizationId: v.id('organization'),
        userId: v.id('user'),
        trigger: v.string(),
        orgObjectivesContinueCursor: v.optional(v.union(v.string(), v.null())),
        orgScopedObjectivesCount: v.optional(v.number()),
        orgScopedCompletedCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { organizationId, userId, trigger } = args;
        const now = Date.now();
        let orgScopedObjectivesCount = args.orgScopedObjectivesCount ?? 0;
        let orgScopedCompletedCount = args.orgScopedCompletedCount ?? 0;

        const earnedAchievements = await ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization', q => q.eq('organization', organizationId))
            .take(LIST_LIMIT);

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
        const defMap = new Map(definitions.map(d => [d._id, d]));

        const earnedCodes = new Set(
            earnedAchievements.map(ea => defMap.get(ea.achievement)?.code).filter(Boolean)
        );

        const objectivesPage = await ctx.db
            .query('objectives')
            .withIndex('by_organization_scope', q =>
                q.eq('organizationId', organizationId).eq('scope', 'organization')
            )
            .paginate({
                numItems: ACHIEVEMENT_BATCH_SIZE,
                cursor: args.orgObjectivesContinueCursor ?? null,
            });

        const batchObjectives = objectivesPage.page;
        orgScopedObjectivesCount += batchObjectives.length;
        orgScopedCompletedCount += batchObjectives.filter(o => o.status === 'completed').length;

        const organizationStreak = await calculateOrganizationStreak(ctx, organizationId);

        const result = await evaluateAndAwardAchievements({
            ctx,
            scopeType: 'organization',
            async evaluate(code) {
                if (earnedCodes.has(code)) return false;

                switch (code) {
                    case 'organization_first_objective':
                        return trigger === 'objective_created' && orgScopedObjectivesCount >= 1;
                    case 'organization_completed_5':
                        return trigger === 'objective_completed' && orgScopedCompletedCount >= 5;
                    case 'organization_completed_15':
                        return trigger === 'objective_completed' && orgScopedCompletedCount >= 15;
                    case 'organization_completed_30':
                        return trigger === 'objective_completed' && orgScopedCompletedCount >= 30;
                    case 'organization_streak_7': {
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

                const orgAchievementId = await ctx.db.insert('organizationAchievements', {
                    organization: organizationId,
                    achievement: defId,
                    earnedAt: now,
                    contributorCount: 1,
                    createdAt: now,
                    updatedAt: now,
                });

                await addContributor(ctx, orgAchievementId, userId, 1);

                await notifyOrganizationAchievementUnlocked(ctx, organizationId, code, points, now);
            },
        });

        if (!objectivesPage.isDone) {
            await ctx.scheduler.runAfter(0, internal.achievements.checkOrganizationAchievements, {
                organizationId,
                userId,
                trigger,
                orgObjectivesContinueCursor: objectivesPage.continueCursor,
                orgScopedObjectivesCount,
                orgScopedCompletedCount,
            });
            return {
                ...result,
                status: 'in_progress',
                processedBatch: batchObjectives.length,
                orgScopedObjectivesCount,
                orgScopedCompletedCount,
            };
        }

        return {
            ...result,
            status: 'completed',
            orgScopedObjectivesCount,
            orgScopedCompletedCount,
        };
    },
});
