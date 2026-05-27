import { ConvexError, Infer } from 'convex/values';
import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import {
    calculateOrganizationStreak,
    calculateUserStreak,
} from '../../domain/achievements/calculations';
import { addContributor } from '../../domain/achievements/contributors';
import { ACHIEVEMENT_DEFINITIONS } from '../../domain/achievements/definitions';
import { shouldSendAchievementNotification } from '../../domain/notifications/preferences';
import { achievementTriggerValidator } from '../../utils/validators';
import { ERROR_CODES } from '../../utils/constants';

type AchievementTrigger = Infer<typeof achievementTriggerValidator>;

const LIST_LIMIT = 1000;
const BATCH_SIZE = 100;
const ACHIEVEMENT_BATCH_SIZE = 50;

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

        const memberUserIds = page.page.map(member => member.userId);

        const preferencesList = await Promise.all(
            memberUserIds.map(uid =>
                ctx.db
                    .query('notificationPreferences')
                    .withIndex('by_user', q => q.eq('userId', uid))
                    .first()
            )
        );

        const preferencesMap = new Map<Id<'user'>, boolean>();
        for (let i = 0; i < memberUserIds.length; i++) {
            const uid = memberUserIds[i]!;
            const pref = preferencesList[i];
            const shouldNotify = pref ? (pref.organizationNotifications ?? true) : true;
            preferencesMap.set(uid, shouldNotify);
        }

        for (const member of page.page) {
            const uid = member.userId;
            const shouldNotify = preferencesMap.get(uid) ?? true;
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

    const activeDefinitions = definitions.filter(definition => definition.isActive);

    const newAchievements: string[] = [];

    for (const definition of activeDefinitions) {
        const shouldAward = await evaluate(definition.code);
        if (shouldAward) {
            await award(definition._id, definition.code, definition.points);
            newAchievements.push(definition.code);
        }
    }

    return { awarded: newAchievements };
}

export async function seedAchievementDefinitionsJob(ctx: MutationCtx) {
    const now = Date.now();

    const existing = await ctx.db.query('achievementDefinitions').first();
    if (existing) {
        return { message: 'Achievements already seeded', count: 0 };
    }

    let count = 0;
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
        await ctx.db.insert('achievementDefinitions', {
            ...definition,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
        count++;
    }

    return { message: 'Achievements seeded successfully', count };
}

export async function checkUserAchievementsJob(
    ctx: MutationCtx,
    args: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        trigger: AchievementTrigger;
        objectivesContinueCursor?: string | null;
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
    const definitionById = new Map(definitions.map(definition => [definition._id, definition]));

    const earnedCodes = new Set(
        earnedAchievements
            .map(earnedAchievement => definitionById.get(earnedAchievement.achievement)?.code)
            .filter(Boolean)
    );

    const objectivesPage = await ctx.db
        .query('objectives')
        .withIndex('by_user_organization', q =>
            q.eq('userId', userId).eq('organizationId', organizationId)
        )
        .paginate({
            numItems: ACHIEVEMENT_BATCH_SIZE,
            cursor: args.objectivesContinueCursor ?? null,
        });

    const objectivesBatch = objectivesPage.page;
    cumulativeObjectiveCount += objectivesBatch.length;
    cumulativeCompletedCount += objectivesBatch.filter(
        objective => objective.status === 'completed'
    ).length;
    cumulativeEarlyBirdCount += objectivesBatch.filter(
        objective =>
            objective.status === 'completed' &&
            objective.deadline != null &&
            objective.updatedAt <= objective.deadline
    ).length;

    const objectiveIds = objectivesBatch.map(objective => objective._id);

    if (objectiveIds.length > 0) {
        progressUpdatesCount += await countProgressUpdatesForObjectives(ctx, userId, objectiveIds);
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

    const earnedAchievements = await ctx.db
        .query('organizationAchievements')
        .withIndex('by_organization', q => q.eq('organization', organizationId))
        .take(LIST_LIMIT);

    const definitions = await ctx.db.query('achievementDefinitions').take(LIST_LIMIT);
    const definitionById = new Map(definitions.map(definition => [definition._id, definition]));

    const earnedCodes = new Set(
        earnedAchievements
            .map(earnedAchievement => definitionById.get(earnedAchievement.achievement)?.code)
            .filter(Boolean)
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
    orgScopedCompletedCount += batchObjectives.filter(
        objective => objective.status === 'completed'
    ).length;

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
}
