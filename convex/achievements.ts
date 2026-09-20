import { internalMutation } from './platform/db/internalMutation';
import { v } from 'convex/values';
import { internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import {
    calculateGlobalUserStreak,
    calculateOrganizationStreak,
} from './domain/achievements/calculations';
import { queryWithRLS } from './platform/rls/wrappers';
import { achievementTriggerValidator } from './utils/validators';
import {
    checkOrganizationAchievementsJob,
    checkUserAchievementsJob,
    notifyOrganizationAchievementMembersJob,
} from './jobs/achievements/checks';
import {
    ACHIEVEMENT_DEFINITIONS,
    getAchievementDefinition,
    getAchievementRule,
    toAchievementDefinitionView,
    type AchievementMetricKey,
} from './domain/achievements/definitions';
import {
    achievementProgressItemValidator,
    achievementStatsValidator,
} from './utils/apiReturnValidators';
import { achievementDefinitionDocumentValidator } from './utils/documentValidators';
const LIST_LIMIT = 1000;
type AchievementMetricSnapshot = Record<AchievementMetricKey, number>;
function getMetricThresholdLimit(
    definitions: Array<{
        threshold: number;
        code: string;
    }>,
    metricKey: AchievementMetricKey
): number {
    const thresholds = definitions
        .filter(definition => getAchievementRule(definition.code)?.metricKey === metricKey)
        .map(definition => definition.threshold)
        .filter(threshold => Number.isFinite(threshold) && threshold > 0)
        .map(Math.ceil);
    return Math.max(1, ...thresholds);
}
const globalUserAchievementMetricsValidator = v.object({
    objectivesCreated: v.number(),
    objectivesCompleted: v.number(),
    progressStreak: v.number(),
    progressUpdates: v.number(),
    earlyBirdCompletions: v.number(),
});
/**
 * Reads only user-owned rows and intentionally bypasses active-organization
 * RLS. Individual achievement awards are globally unique per user in the
 * schema, so their measured progress must use the same global scope.
 */
export const getGlobalUserAchievementMetricsInternal = internalQuery({
    args: {
        userId: v.id('user'),
        objectivesCreatedLimit: v.number(),
        objectivesCompletedLimit: v.number(),
        earlyBirdLimit: v.number(),
        progressUpdatesLimit: v.number(),
    },
    returns: globalUserAchievementMetricsValidator,
    handler: async (ctx, args) => {
        const [objectivesCreated, completedObjectives, earlyBirdObjectives, progressUpdates] =
            await Promise.all([
                ctx.db
                    .query('objectives')
                    .withIndex('by_createdBy_organization', q => q.eq('createdBy', args.userId))
                    .take(args.objectivesCreatedLimit),
                ctx.db
                    .query('objectives')
                    .withIndex('by_createdBy_status', q =>
                        q.eq('createdBy', args.userId).eq('status', 'completed')
                    )
                    .take(args.objectivesCompletedLimit),
                ctx.db
                    .query('objectives')
                    .withIndex('by_createdBy_earlyBirdCompleted', q =>
                        q.eq('createdBy', args.userId).eq('earlyBirdCompleted', true)
                    )
                    .take(args.earlyBirdLimit),
                ctx.db
                    .query('progressUpdates')
                    .withIndex('by_createdBy_date', q => q.eq('createdBy', args.userId))
                    .take(args.progressUpdatesLimit),
            ]);
        return {
            objectivesCreated: objectivesCreated.length,
            objectivesCompleted: completedObjectives.length,
            progressStreak: await calculateGlobalUserStreak(ctx, args.userId),
            progressUpdates: progressUpdates.length,
            earlyBirdCompletions: earlyBirdObjectives.length,
        };
    },
});
export const getUserAchievementStats = queryWithRLS({
    args: {},
    returns: achievementStatsValidator,
    handler: async ctx => {
        const userId = ctx.userId;
        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);
        let totalPoints = 0;
        for (const obtainedAchievement of obtainedAchievements) {
            const definition = getAchievementDefinition(obtainedAchievement.achievement);
            if (definition) {
                totalPoints += definition.points;
            }
        }
        const individualDefinitions = ACHIEVEMENT_DEFINITIONS.filter(
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
    returns: v.array(achievementDefinitionDocumentValidator),
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const MAX_QUERY_LIMIT = 100;
        const limit = Math.min(args.limit ?? 5, MAX_QUERY_LIMIT);
        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .order('desc')
            .take(limit);
        const achievementsWithDetails = obtainedAchievements
            .map(obtainedAchievement => getAchievementDefinition(obtainedAchievement.achievement))
            .map(definition => (definition ? toAchievementDefinitionView(definition) : undefined))
            .filter(
                (definition): definition is NonNullable<typeof definition> =>
                    definition !== undefined
            );
        return achievementsWithDetails;
    },
});
export const getUserAchievementProgress = queryWithRLS({
    args: {},
    returns: v.array(achievementProgressItemValidator),
    handler: async ctx => {
        const userId = ctx.userId;
        const organizationId = ctx.organizationId;
        const individualDefinitions = ACHIEVEMENT_DEFINITIONS.filter(
            definition => definition.type === 'individual'
        );
        const organizationDefinitions = organizationId
            ? ACHIEVEMENT_DEFINITIONS.filter(definition => definition.type === 'organization')
            : [];
        const activeDefinitions = [...individualDefinitions, ...organizationDefinitions];
        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);
        const earnedCodes = new Set(
            obtainedAchievements.map(obtainedAchievement => obtainedAchievement.achievement)
        );
        const organizationAchievements = organizationId
            ? await ctx.db
                  .query('organizationAchievements')
                  .withIndex('by_organization_achievement', q =>
                      q.eq('organization', organizationId)
                  )
                  .take(LIST_LIMIT)
            : [];
        const organizationEarnedCodes = new Set(
            organizationAchievements.map(
                organizationAchievement => organizationAchievement.achievement
            )
        );
        // Achievement progress only needs to be exact until the largest active
        // threshold for a metric. Once that threshold is reached, a saturated
        // count is equivalent for every achievement card and keeps each read
        // bounded even for organizations with a long history.
        const objectivesCreatedLimit = getMetricThresholdLimit(
            individualDefinitions,
            'objectivesCreated'
        );
        const objectivesCompletedLimit = getMetricThresholdLimit(
            individualDefinitions,
            'objectivesCompleted'
        );
        const earlyBirdLimit = getMetricThresholdLimit(
            individualDefinitions,
            'earlyBirdCompletions'
        );
        const progressUpdatesLimit = getMetricThresholdLimit(
            individualDefinitions,
            'progressUpdates'
        );
        const organizationObjectivesCreatedLimit = getMetricThresholdLimit(
            organizationDefinitions,
            'organizationObjectivesCreated'
        );
        const organizationObjectivesCompletedLimit = getMetricThresholdLimit(
            organizationDefinitions,
            'organizationObjectivesCompleted'
        );
        const globalUserMetrics = await ctx.runQuery(
            internal.achievements.getGlobalUserAchievementMetricsInternal,
            {
                userId,
                objectivesCreatedLimit,
                objectivesCompletedLimit,
                earlyBirdLimit,
                progressUpdatesLimit,
            }
        );
        const organizationObjectivesCreated = organizationId
            ? await ctx.db
                  .query('objectives')
                  .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                  .take(organizationObjectivesCreatedLimit)
            : [];
        const completedOrganizationObjectives = organizationId
            ? await ctx.db
                  .query('objectives')
                  .withIndex('by_organization_status', q =>
                      q.eq('organizationId', organizationId).eq('status', 'completed')
                  )
                  .take(organizationObjectivesCompletedLimit)
            : [];
        const organizationProgressStreak = organizationId
            ? await calculateOrganizationStreak(ctx, organizationId)
            : 0;
        const metrics: AchievementMetricSnapshot = {
            ...globalUserMetrics,
            organizationObjectivesCreated: organizationObjectivesCreated.length,
            organizationObjectivesCompleted: completedOrganizationObjectives.length,
            organizationProgressStreak,
        };
        const progressList = activeDefinitions.map(definition => {
            const earnedAchievement =
                definition.type === 'organization'
                    ? organizationAchievements.find(
                          organizationAchievement =>
                              organizationAchievement.achievement === definition.code
                      )
                    : obtainedAchievements.find(
                          obtainedAchievement => obtainedAchievement.achievement === definition.code
                      );
            const isEarned =
                definition.type === 'organization'
                    ? organizationEarnedCodes.has(definition.code)
                    : earnedCodes.has(definition.code);
            const rule = getAchievementRule(definition.code);
            const measuredProgress = rule ? metrics[rule.metricKey] : 0;
            // Award records are authoritative. A completed batched evaluator
            // must never be paired with progress below its own threshold while
            // a reactive metrics query catches up.
            const currentProgress = isEarned
                ? Math.max(measuredProgress, definition.threshold)
                : measuredProgress;
            return {
                definition: toAchievementDefinitionView(definition),
                currentProgress,
                isEarned,
                earnedAt: isEarned ? earnedAchievement?.earnedAt : undefined,
            };
        });
        return progressList;
    },
});
export const checkUserAchievements = internalMutation({
    returns: v.null(),
    args: {
        userId: v.id('user'),
        organizationId: v.id('organization'),
        trigger: achievementTriggerValidator,
        objectivesContinueCursor: v.optional(v.union(v.string(), v.null())),
        progressUpdatesContinueCursor: v.optional(v.union(v.string(), v.null())),
        objectivesDone: v.optional(v.boolean()),
        progressUpdatesDone: v.optional(v.boolean()),
        progressUpdatesCount: v.optional(v.number()),
        cumulativeObjectiveCount: v.optional(v.number()),
        cumulativeCompletedCount: v.optional(v.number()),
        cumulativeEarlyBirdCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await checkUserAchievementsJob(ctx, args);
    },
});
export const notifyOrganizationAchievementMembers = internalMutation({
    returns: v.null(),
    args: {
        organizationId: v.id('organization'),
        code: v.string(),
        points: v.number(),
        threshold: v.number(),
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        return await notifyOrganizationAchievementMembersJob(ctx, args);
    },
});
export const checkOrganizationAchievements = internalMutation({
    returns: v.null(),
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
