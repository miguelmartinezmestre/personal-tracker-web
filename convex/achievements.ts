import { v, ConvexError } from 'convex/values';
import { internalMutation, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { countStreakFromUpdates } from './domain/achievements/calculations';
import { getContributors } from './domain/achievements/contributors';
import { queryWithRLS } from './rls';
import { achievementTypeValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import { getAuthUserIdentity } from 'kitcn/auth';
import {
    checkOrganizationAchievementsJob,
    checkUserAchievementsJob,
    seedAchievementDefinitionsJob,
} from './jobs/achievements/checks';
const LIST_LIMIT = 1000;

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

        const objectivesCount = ctx.organizationId
            ? await ctx.db
                  .query('objectives')
                  .withIndex('by_user_organization', q =>
                      q.eq('userId', userId).eq('organizationId', ctx.organizationId!)
                  )
                  .take(LIST_LIMIT)
            : await ctx.db
                  .query('objectives')
                  .withIndex('by_user_scope', q => q.eq('userId', userId).eq('scope', 'personal'))
                  .take(LIST_LIMIT);

        const completedObjectives = objectivesCount.filter(o => o.status === 'completed');
        let progressUpdatesCount = 0;
        let progressUpdatesForObjectives: Doc<'progressUpdates'>[] = [];

        if (objectivesCount.length > 0) {
            const objectiveIdsSet = new Set(objectivesCount.map(objective => objective._id));
            const userProgressUpdates = await ctx.db
                .query('progressUpdates')
                .withIndex('by_user_date', q => q.eq('userId', userId))
                .take(LIST_LIMIT);

            progressUpdatesForObjectives = userProgressUpdates.filter(update =>
                objectiveIdsSet.has(update.objective)
            );
            progressUpdatesCount = progressUpdatesForObjectives.length;
        }

        const streak = ctx.organizationId
            ? countStreakFromUpdates(progressUpdatesForObjectives)
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
        return await seedAchievementDefinitionsJob(ctx);
    },
});

export const seedAchievementDefinitions = mutation({
    args: {},
    handler: async (ctx): Promise<{ message: string; count: number }> => {
        const identity = await getAuthUserIdentity(ctx);
        if (!identity) {
            throw new ConvexError(ERROR_CODES.AUTH_REQUIRED);
        }

        const userId = identity.userId;

        await ctx.runQuery(internal.setup.requireAdminInternal, { userId });

        return await ctx.runMutation(internal.achievements.seedAchievementDefinitionsInternal, {});
    },
});

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
        return await checkUserAchievementsJob(ctx, args);
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
        return await checkOrganizationAchievementsJob(ctx, args);
    },
});
