import type { Infer } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
    calculateGlobalUserStreak,
    calculateOrganizationStreak,
    isEarlyBirdCompletion,
} from '../../domain/achievements/calculations';
import {
    ACHIEVEMENT_DEFINITIONS,
    getAchievementRule,
    type AchievementDefinition,
    type AchievementMetricKey,
} from '../../domain/achievements/definitions';
import {
    shouldSendAchievementNotification,
    shouldSendOrganizationNotification,
} from '../../domain/notifications/preferences';
import type { achievementTriggerValidator } from '../../utils/validators';

type AchievementTrigger = Infer<typeof achievementTriggerValidator>;
type AchievementMetricSnapshot = Record<AchievementMetricKey, number>;

const LIST_LIMIT = 1000;
const ACHIEVEMENT_BATCH_SIZE = 50;

function canReceiveAchievement(
    user: { deletedAt?: number; banned?: boolean | null; banExpires?: number | null } | null,
    now: number
) {
    if (!user || user.deletedAt !== undefined) {
        return false;
    }
    return user.banned !== true || (user.banExpires != null && user.banExpires <= now);
}

type EvaluateAndAwardParams = {
    scopeType: 'individual' | 'organization';
    evaluate: (definition: AchievementDefinition) => Promise<boolean> | boolean;
    award: (definition: AchievementDefinition) => Promise<boolean>;
};

async function evaluateAndAwardAchievements(params: EvaluateAndAwardParams) {
    const { scopeType, evaluate, award } = params;

    const activeDefinitions = ACHIEVEMENT_DEFINITIONS.filter(
        definition => definition.type === scopeType
    );

    const newAchievements: string[] = [];

    for (const definition of activeDefinitions) {
        const shouldAward = await evaluate(definition);
        if (shouldAward && (await award(definition))) {
            newAchievements.push(definition.code);
        }
    }

    return { awarded: newAchievements };
}

export async function checkUserAchievementsJob(
    ctx: MutationCtx,
    args: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        trigger: AchievementTrigger;
        objectivesContinueCursor?: string | null;
        progressUpdatesContinueCursor?: string | null;
        objectivesDone?: boolean;
        progressUpdatesDone?: boolean;
        progressUpdatesCount?: number;
        cumulativeObjectiveCount?: number;
        cumulativeCompletedCount?: number;
        cumulativeEarlyBirdCount?: number;
    }
) {
    const { userId, organizationId, trigger } = args;
    const now = Date.now();
    let progressUpdatesCount = args.progressUpdatesCount ?? 0;
    let cumulativeObjectiveCount = args.cumulativeObjectiveCount ?? 0;
    let cumulativeCompletedCount = args.cumulativeCompletedCount ?? 0;
    let cumulativeEarlyBirdCount = args.cumulativeEarlyBirdCount ?? 0;

    const user = await ctx.db.get('user', userId);
    if (!canReceiveAchievement(user, now)) {
        return { awarded: [], status: 'completed', aborted: true };
    }

    // The organization only contextualizes the notification. The award and
    // all of its metrics are global to the user, so a queued evaluator must
    // remain valid after the user leaves the organization that triggered it.
    const contextOrganization = await ctx.db.get('organization', organizationId);
    const contextMembership = contextOrganization
        ? await ctx.db
              .query('member')
              .withIndex('by_organizationId_and_userId', q =>
                  q.eq('organizationId', organizationId).eq('userId', userId)
              )
              .first()
        : null;
    const canSendContextualNotification = Boolean(contextOrganization && contextMembership);

    const earnedAchievements = await ctx.db
        .query('obtainedAchievements')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(LIST_LIMIT);

    const earnedCodes = new Set(
        earnedAchievements.map(earnedAchievement => earnedAchievement.achievement)
    );

    let objectivesDone = args.objectivesDone ?? false;
    let progressUpdatesDone = args.progressUpdatesDone ?? false;
    let objectivesContinueCursor = args.objectivesContinueCursor ?? null;
    let progressUpdatesContinueCursor = args.progressUpdatesContinueCursor ?? null;
    let processedObjectives = 0;
    let processedProgressUpdates = 0;
    let didPaginate = false;

    if (!objectivesDone) {
        const objectivesPage = await ctx.db
            .query('objectives')
            .withIndex('by_createdBy_organization', q => q.eq('createdBy', userId))
            .paginate({
                numItems: ACHIEVEMENT_BATCH_SIZE,
                cursor: objectivesContinueCursor,
            });

        const objectivesBatch = objectivesPage.page;
        processedObjectives = objectivesBatch.length;
        cumulativeObjectiveCount += objectivesBatch.length;
        cumulativeCompletedCount += objectivesBatch.filter(
            objective => objective.status === 'completed'
        ).length;
        cumulativeEarlyBirdCount += objectivesBatch.filter(isEarlyBirdCompletion).length;
        objectivesDone = objectivesPage.isDone;
        objectivesContinueCursor = objectivesPage.continueCursor;
        didPaginate = true;
    }

    if (!didPaginate && !progressUpdatesDone) {
        const updatesPage = await ctx.db
            .query('progressUpdates')
            .withIndex('by_createdBy_date', q => q.eq('createdBy', userId))
            .paginate({
                numItems: ACHIEVEMENT_BATCH_SIZE,
                cursor: progressUpdatesContinueCursor,
            });
        processedProgressUpdates = updatesPage.page.length;
        progressUpdatesCount += updatesPage.page.length;
        progressUpdatesDone = updatesPage.isDone;
        progressUpdatesContinueCursor = updatesPage.continueCursor;
    }

    const streak = await calculateGlobalUserStreak(ctx, userId);

    const metrics: AchievementMetricSnapshot = {
        objectivesCreated: cumulativeObjectiveCount,
        objectivesCompleted: cumulativeCompletedCount,
        progressStreak: streak,
        progressUpdates: progressUpdatesCount,
        earlyBirdCompletions: cumulativeEarlyBirdCount,
        organizationObjectivesCreated: 0,
        organizationObjectivesCompleted: 0,
        organizationProgressStreak: 0,
    };

    const result = await evaluateAndAwardAchievements({
        scopeType: 'individual',
        evaluate(definition) {
            if (earnedCodes.has(definition.code)) {
                return false;
            }
            const rule = getAchievementRule(definition.code);
            return Boolean(
                rule && rule.trigger === trigger && metrics[rule.metricKey] >= definition.threshold
            );
        },
        async award(definition) {
            const { code, points, threshold } = definition;
            if (!canReceiveAchievement(await ctx.db.get('user', userId), now)) {
                return false;
            }

            const alreadyAwarded = await ctx.db
                .query('obtainedAchievements')
                .withIndex('by_user_achievement', q =>
                    q.eq('userId', userId).eq('achievement', code)
                )
                .first();

            if (alreadyAwarded) {
                return false;
            }

            await ctx.db.insert('obtainedAchievements', {
                userId: userId,
                achievement: code,
                earnedAt: now,
                createdAt: now,
                updatedAt: now,
            });

            const shouldNotify = await shouldSendAchievementNotification(ctx, userId);
            if (shouldNotify && canSendContextualNotification) {
                await ctx.db.insert('notifications', {
                    userId: userId,
                    organizationId,
                    objective: undefined,
                    read: false,
                    notificationType: 'achievement',
                    notificationDate: now,
                    messageKey: 'achievementEarned',
                    messageParams: { code, points, threshold },
                    message: `Achievement unlocked: "${code}"! You earned ${points} points.`,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            return true;
        },
    });

    if (!objectivesDone || !progressUpdatesDone) {
        await ctx.scheduler.runAfter(0, internal.achievements.checkUserAchievements, {
            userId,
            organizationId,
            trigger,
            objectivesContinueCursor,
            progressUpdatesContinueCursor,
            objectivesDone,
            progressUpdatesDone,
            progressUpdatesCount,
            cumulativeObjectiveCount,
            cumulativeCompletedCount,
            cumulativeEarlyBirdCount,
        });
        return {
            ...result,
            status: 'in_progress',
            processedBatch: processedObjectives + processedProgressUpdates,
            cumulativeObjectiveCount,
            cumulativeCompletedCount,
        };
    }

    return { ...result, status: 'completed' };
}

export async function checkOrganizationAchievementsJob(
    ctx: MutationCtx,
    args: {
        organizationId: Id<'organization'>;
        userId: Id<'user'>;
        trigger: AchievementTrigger;
        orgObjectivesContinueCursor?: string | null;
        orgScopedObjectivesCount?: number;
        orgScopedCompletedCount?: number;
    }
) {
    const { organizationId, userId, trigger } = args;
    const now = Date.now();
    let orgScopedObjectivesCount = args.orgScopedObjectivesCount ?? 0;
    let orgScopedCompletedCount = args.orgScopedCompletedCount ?? 0;

    const organization = await ctx.db.get('organization', organizationId);
    const membership = organization
        ? await ctx.db
              .query('member')
              .withIndex('by_organizationId_and_userId', q =>
                  q.eq('organizationId', organizationId).eq('userId', userId)
              )
              .first()
        : null;
    if (!organization || !membership) {
        return {
            awarded: [],
            status: 'completed',
            aborted: true,
            orgScopedObjectivesCount,
            orgScopedCompletedCount,
        };
    }

    const earnedAchievements = await ctx.db
        .query('organizationAchievements')
        .withIndex('by_organization_achievement', q => q.eq('organization', organizationId))
        .take(LIST_LIMIT);

    const earnedCodes = new Set(
        earnedAchievements.map(earnedAchievement => earnedAchievement.achievement)
    );

    const objectivesPage = await ctx.db
        .query('objectives')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .paginate({
            numItems: ACHIEVEMENT_BATCH_SIZE,
            cursor: args.orgObjectivesContinueCursor ?? null,
        });

    const batchObjectives = objectivesPage.page;
    orgScopedObjectivesCount += batchObjectives.length;
    orgScopedCompletedCount += batchObjectives.filter(
        objective => objective.status === 'completed'
    ).length;

    const organizationStreak = await calculateOrganizationStreak(ctx, organizationId);

    const metrics: AchievementMetricSnapshot = {
        objectivesCreated: 0,
        objectivesCompleted: 0,
        progressStreak: 0,
        progressUpdates: 0,
        earlyBirdCompletions: 0,
        organizationObjectivesCreated: orgScopedObjectivesCount,
        organizationObjectivesCompleted: orgScopedCompletedCount,
        organizationProgressStreak: organizationStreak,
    };

    const result = await evaluateAndAwardAchievements({
        scopeType: 'organization',
        evaluate(definition) {
            if (earnedCodes.has(definition.code)) {
                return false;
            }
            const rule = getAchievementRule(definition.code);
            return Boolean(
                rule && rule.trigger === trigger && metrics[rule.metricKey] >= definition.threshold
            );
        },
        async award(definition) {
            const { code, points, threshold } = definition;
            // Re-read both rows immediately before the write. Convex tracks
            // them in this transaction's read set, so a concurrent member or
            // organization deletion conflicts and retries into the abort path.
            const currentOrganization = await ctx.db.get('organization', organizationId);
            const currentMembership = currentOrganization
                ? await ctx.db
                      .query('member')
                      .withIndex('by_organizationId_and_userId', q =>
                          q.eq('organizationId', organizationId).eq('userId', userId)
                      )
                      .first()
                : null;
            if (!currentOrganization || !currentMembership) {
                return false;
            }

            const alreadyAwarded = await ctx.db
                .query('organizationAchievements')
                .withIndex('by_organization_achievement', q =>
                    q.eq('organization', organizationId).eq('achievement', code)
                )
                .first();

            if (alreadyAwarded) {
                return false;
            }

            const orgAchievementId = await ctx.db.insert('organizationAchievements', {
                organization: organizationId,
                achievement: code,
                earnedAt: now,
                createdAt: now,
                updatedAt: now,
            });

            const existingContributor = await ctx.db
                .query('organizationAchievementContributors')
                .withIndex('by_organizationAchievement_user', q =>
                    q.eq('organizationAchievementId', orgAchievementId).eq('userId', userId)
                )
                .first();

            if (!existingContributor) {
                await ctx.db.insert('organizationAchievementContributors', {
                    organizationAchievementId: orgAchievementId,
                    userId,
                    contributedAt: Date.now(),
                    contributionValue: 1,
                });
            }

            await ctx.scheduler.runAfter(
                0,
                internal.achievements.notifyOrganizationAchievementMembers,
                {
                    organizationId,
                    code,
                    points,
                    threshold,
                    cursor: null,
                }
            );
            return true;
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
}

export async function notifyOrganizationAchievementMembersJob(
    ctx: MutationCtx,
    args: {
        organizationId: Id<'organization'>;
        code: string;
        points: number;
        threshold?: number;
        cursor?: string | null;
    }
) {
    if (!(await ctx.db.get('organization', args.organizationId))) {
        return { status: 'completed' as const, processed: 0, aborted: true };
    }

    const page = await ctx.db
        .query('member')
        .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
        .paginate({
            numItems: ACHIEVEMENT_BATCH_SIZE,
            cursor: args.cursor ?? null,
        });
    const now = Date.now();

    for (const member of page.page) {
        if (!canReceiveAchievement(await ctx.db.get('user', member.userId), now)) {
            continue;
        }
        if (!(await shouldSendOrganizationNotification(ctx, member.userId))) {
            continue;
        }
        await ctx.db.insert('notifications', {
            userId: member.userId,
            organizationId: args.organizationId,
            objective: undefined,
            read: false,
            notificationType: 'achievement',
            notificationDate: now,
            ...(args.threshold === undefined
                ? {}
                : {
                      messageKey: 'organizationAchievementEarned',
                      messageParams: {
                          code: args.code,
                          points: args.points,
                          threshold: args.threshold,
                      },
                  }),
            message: `Organization achievement unlocked: "${args.code}"! The organization earned ${args.points} points.`,
            createdAt: now,
            updatedAt: now,
        });
    }

    if (!page.isDone) {
        await ctx.scheduler.runAfter(
            0,
            internal.achievements.notifyOrganizationAchievementMembers,
            {
                ...args,
                cursor: page.continueCursor,
            }
        );
        return { status: 'in_progress' as const, processed: page.page.length };
    }

    return { status: 'completed' as const, processed: page.page.length };
}
