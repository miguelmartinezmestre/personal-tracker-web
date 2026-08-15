import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import {
    calculateGlobalUserStreak,
    calculateOrganizationStreak,
    isEarlyBirdCompletion,
} from './domain/achievements/calculations';
import { internalQueryWithRLS, mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { achievementTypeValidator, achievementTriggerValidator } from './utils/validators';
import {
    checkOrganizationAchievementsJob,
    checkUserAchievementsJob,
    notifyOrganizationAchievementMembersJob,
    seedAchievementDefinitionsJob,
} from './jobs/achievements/checks';
import { getAchievementRule, type AchievementMetricKey } from './domain/achievements/definitions';
import {
    achievementProgressItemValidator,
    achievementStatsValidator,
    organizationAchievementWithDefinitionValidator,
    seedAchievementsResultValidator,
    userAchievementWithDefinitionValidator,
} from './utils/apiReturnValidators';
import { achievementDefinitionDocumentValidator } from './utils/documentValidators';
const LIST_LIMIT = 1000;
const EARLY_BIRD_BACKFILL_BATCH_SIZE = 50;
type AchievementMetricSnapshot = Record<AchievementMetricKey, number>;

function getMetricThresholdLimit(
    definitions: Array<{ threshold: number; code: string }>,
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

export const getAchievementDefinitions = internalQueryWithRLS({
    args: {
        type: v.optional(achievementTypeValidator),
    },
    returns: v.array(achievementDefinitionDocumentValidator),
    handler: async (ctx, args) => {
        const typeFilter = args.type;
        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);

        if (typeFilter) {
            return definitions.filter(
                definition => definition.type === typeFilter && definition.isActive
            );
        }

        return definitions.filter(definition => definition.isActive);
    },
});

export const getUserAchievements = internalQueryWithRLS({
    args: {},
    returns: v.array(userAchievementWithDefinitionValidator),
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

export const getOrganizationAchievements = internalQueryWithRLS({
    args: {
        organizationId: v.id('organization'),
    },
    returns: v.array(organizationAchievementWithDefinitionValidator),
    handler: async (ctx, args) => {
        const organizationAchievements = await ctx.db
            .query('organizationAchievements')
            .withIndex('by_organization_achievement', q =>
                q.eq('organization', args.organizationId)
            )
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

export const getUserAchievementStats = queryWithRLS({
    args: {},
    returns: achievementStatsValidator,
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

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
        const definitionById = new Map(definitions.map(definition => [definition._id, definition]));

        const achievementsWithDetails = obtainedAchievements
            .map(obtainedAchievement => definitionById.get(obtainedAchievement.achievement))
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

        const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
        const individualDefinitions = definitions.filter(
            definition => definition.type === 'individual'
        );
        const organizationDefinitions = organizationId
            ? definitions.filter(definition => definition.type === 'organization')
            : [];

        const activeIndividualDefinitions = individualDefinitions.filter(
            definition => definition.isActive
        );
        const activeOrganizationDefinitions = organizationDefinitions.filter(
            definition => definition.isActive
        );
        const activeDefinitions = [
            ...activeIndividualDefinitions,
            ...activeOrganizationDefinitions,
        ];

        const obtainedAchievements = await ctx.db
            .query('obtainedAchievements')
            .withIndex('by_user', q => q.eq('userId', userId))
            .take(LIST_LIMIT);

        const earnedIds = new Set(
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

        const organizationEarnedIds = new Set(
            organizationAchievements.map(
                organizationAchievement => organizationAchievement.achievement
            )
        );

        // Achievement progress only needs to be exact until the largest active
        // threshold for a metric. Once that threshold is reached, a saturated
        // count is equivalent for every achievement card and keeps each read
        // bounded even for organizations with a long history.
        const objectivesCreatedLimit = getMetricThresholdLimit(
            activeIndividualDefinitions,
            'objectivesCreated'
        );
        const objectivesCompletedLimit = getMetricThresholdLimit(
            activeIndividualDefinitions,
            'objectivesCompleted'
        );
        const earlyBirdLimit = getMetricThresholdLimit(
            activeIndividualDefinitions,
            'earlyBirdCompletions'
        );
        const progressUpdatesLimit = getMetricThresholdLimit(
            activeIndividualDefinitions,
            'progressUpdates'
        );
        const organizationObjectivesCreatedLimit = getMetricThresholdLimit(
            activeOrganizationDefinitions,
            'organizationObjectivesCreated'
        );
        const organizationObjectivesCompletedLimit = getMetricThresholdLimit(
            activeOrganizationDefinitions,
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
                              organizationAchievement.achievement === definition._id
                      )
                    : obtainedAchievements.find(
                          obtainedAchievement => obtainedAchievement.achievement === definition._id
                      );
            const isEarned =
                definition.type === 'organization'
                    ? organizationEarnedIds.has(definition._id)
                    : earnedIds.has(definition._id);
            const rule = getAchievementRule(definition.code);
            const measuredProgress = rule ? metrics[rule.metricKey] : 0;
            // Award records are authoritative. A completed batched evaluator
            // must never be paired with progress below its own threshold while
            // a reactive metrics query catches up.
            const currentProgress = isEarned
                ? Math.max(measuredProgress, definition.threshold)
                : measuredProgress;

            return {
                definition,
                currentProgress,
                isEarned,
                earnedAt: isEarned ? earnedAchievement?.earnedAt : undefined,
            };
        });

        return progressList;
    },
});

export const getUnviewedAchievementsCount = internalQueryWithRLS({
    args: {},
    returns: v.number(),
    handler: async ctx => {
        const userId = ctx.userId;
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            return 0;
        }

        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_organization_read_type', q =>
                q
                    .eq('userId', userId)
                    .eq('organizationId', organizationId)
                    .eq('read', false)
                    .eq('notificationType', 'achievement')
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

/**
 * Migrates objectives created before `earlyBirdCompleted` was materialized.
 * The indexed undefined bucket shrinks after every patch, so each invocation
 * is bounded and no cursor can be invalidated by the writes.
 */
export const backfillObjectiveEarlyBirdFacts = internalMutation({
    args: {},
    handler: async ctx => {
        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_earlyBirdCompleted', q => q.eq('earlyBirdCompleted', undefined))
            .take(EARLY_BIRD_BACKFILL_BATCH_SIZE);

        for (const objective of objectives) {
            await ctx.db.patch('objectives', objective._id, {
                earlyBirdCompleted: isEarlyBirdCompletion(objective),
            });
        }

        if (objectives.length === EARLY_BIRD_BACKFILL_BATCH_SIZE) {
            await ctx.scheduler.runAfter(
                0,
                internal.achievements.backfillObjectiveEarlyBirdFacts,
                {}
            );
            return { status: 'in_progress' as const, processed: objectives.length };
        }

        return { status: 'completed' as const, processed: objectives.length };
    },
});

export const seedAchievementDefinitions = mutationWithRLS({
    args: {},
    returns: seedAchievementsResultValidator,
    handler: async (ctx): Promise<{ message: string; count: number }> => {
        await ctx.runQuery(internal.setup.requireAdminInternal, { userId: ctx.userId });

        return await ctx.runMutation(internal.achievements.seedAchievementDefinitionsInternal, {});
    },
});

export const checkUserAchievements = internalMutation({
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
    args: {
        organizationId: v.id('organization'),
        code: v.string(),
        points: v.number(),
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        return await notifyOrganizationAchievementMembersJob(ctx, args);
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
