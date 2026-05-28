import { v, ConvexError } from 'convex/values';
import { internalMutation, mutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { countStreakFromUpdates } from './domain/achievements/calculations';
import { getContributors } from './domain/achievements/contributors';
import { queryWithRLS } from './rls';
import { achievementTypeValidator, achievementTriggerValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import { getAuthUserIdentity } from 'kitcn/auth';
import {
    checkOrganizationAchievementsJob,
    checkUserAchievementsJob,
    seedAchievementDefinitionsJob,
} from './jobs/achievements/checks';
import { getAchievementRule, type AchievementMetricKey } from './domain/achievements/definitions';
const LIST_LIMIT = 1000;
type AchievementMetricSnapshot = Record<AchievementMetricKey, number>;

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
            return definitions.filter(definition => definition.isActive);
        }

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
        return definitions.filter(definition => definition.isActive);
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
        const definitionById = new Map(definitions.map(definition => [definition._id, definition]));

        const achievementsWithDetails = obtainedAchievements.map(obtainedAchievement => ({
            ...obtainedAchievement,
            definition: definitionById.get(obtainedAchievement.achievement),
            user: obtainedAchievement.userId,
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
        const definitionById = new Map(definitions.map(definition => [definition._id, definition]));

        const achievementsWithDetails = organizationAchievements.map(organizationAchievement => ({
            ...organizationAchievement,
            definition: definitionById.get(organizationAchievement.achievement),
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
        const definitionById = new Map(
            allDefinitions.map(definition => [definition._id, definition])
        );

        let totalPoints = 0;
        for (const obtainedAchievement of obtainedAchievements) {
            const definition = definitionById.get(obtainedAchievement.achievement);
            if (definition) {
                totalPoints += definition.points;
            }
        }

        const individualDefinitions = allDefinitions.filter(
            definition => definition.type === 'individual'
        );

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
        const definitionById = new Map(definitions.map(definition => [definition._id, definition]));

        const achievementsWithDetails = obtainedAchievements
            .map(obtainedAchievement => definitionById.get(obtainedAchievement.achievement))
            .filter(
                (definition): definition is NonNullable<typeof definition> => definition !== null
            );

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

        const activeDefinitions = definitions.filter(definition => definition.isActive);

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        const earnedIds = new Set(
            obtainedAchievements.map(obtainedAchievement => obtainedAchievement.achievement)
        );

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

        const completedObjectives = objectivesCount.filter(
            objective => objective.status === 'completed'
        );
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

        const metrics: AchievementMetricSnapshot = {
            objectivesCreated: objectivesCount.length,
            objectivesCompleted: completedObjectives.length,
            progressStreak: streak,
            progressUpdates: progressUpdatesCount,
            earlyBirdCompletions: completedObjectives.filter(objective => {
                if (!objective.deadline) return false;
                return objective.updatedAt <= objective.deadline;
            }).length,
            organizationObjectivesCreated: 0,
            organizationObjectivesCompleted: 0,
            organizationProgressStreak: 0,
        };

        const progressList = activeDefinitions.map(definition => {
            const isEarned = earnedIds.has(definition._id);
            const rule = getAchievementRule(definition.code);
            const currentProgress = rule ? metrics[rule.metricKey] : 0;

            return {
                definition,
                currentProgress,
                isEarned,
                earnedAt: isEarned
                    ? obtainedAchievements.find(
                          obtainedAchievement => obtainedAchievement.achievement === definition._id
                      )?.earnedAt
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
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            return 0;
        }

        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_organization_type_read', q =>
                q
                    .eq('userId', userId)
                    .eq('organizationId', organizationId)
                    .eq('notificationType', 'achievement')
                    .eq('read', false)
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
        trigger: achievementTriggerValidator,
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
        trigger: achievementTriggerValidator,
        orgObjectivesContinueCursor: v.optional(v.union(v.string(), v.null())),
        orgScopedObjectivesCount: v.optional(v.number()),
        orgScopedCompletedCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await checkOrganizationAchievementsJob(ctx, args);
    },
});
