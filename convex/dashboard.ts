import { queryWithRLS } from './platform/rls/wrappers';
import { v } from 'convex/values';
import { TIME, DASHBOARD, PAGINATION } from './utils/constants';
import { computeProgressPercent } from './domain/objectives/metrics';
import { canUserViewObjectiveInList } from './domain/objectives/list';
import { getCollaboratedObjectiveIdsForUser } from './domain/objectives/collaborators';
import { objectiveStatusValidator } from './utils/validators';

const LIST_LIMIT = 1000;

export const getDashboardStats = queryWithRLS({
    args: {},
    returns: v.object({
        totalObjectives: v.number(),
        completedObjectives: v.number(),
        pendingObjectives: v.number(),
    }),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return { totalObjectives: 0, completedObjectives: 0, pendingObjectives: 0 };
        }

        const collaboratedObjectiveIds = await getCollaboratedObjectiveIdsForUser(
            ctx,
            ctx.userId,
            organizationId
        );

        // Count across all pages so totals stay correct beyond LIST_LIMIT
        // objectives (a single take(1000) silently truncated large organizations).
        let totalObjectives = 0;
        let completedObjectives = 0;
        let pendingObjectives = 0;
        let cursor: string | null = null;
        let isDone = false;

        while (!isDone) {
            const page = await ctx.db
                .query('objectives')
                .withIndex('by_organization', q => q.eq('organizationId', organizationId))
                .paginate({ numItems: 200, cursor });

            for (const objective of page.page) {
                if (objective.deletedAt !== undefined) continue;
                if (!canUserViewObjectiveInList(ctx, objective, collaboratedObjectiveIds)) continue;
                totalObjectives += 1;
                if (objective.status === 'completed') {
                    completedObjectives += 1;
                } else {
                    pendingObjectives += 1;
                }
            }

            isDone = page.isDone;
            cursor = page.continueCursor;
        }

        return { totalObjectives, completedObjectives, pendingObjectives };
    },
});

export const getMonthlyProgress = queryWithRLS({
    args: {
        months: v.optional(v.number()),
    },
    returns: v.object({
        items: v.array(v.object({ month: v.string(), monthKey: v.string(), count: v.number() })),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return { items: [], isTruncated: false };
        }

        const userId = ctx.userId;
        const monthsToFetch = args.months ?? DASHBOARD.MONTHS_TO_SHOW;

        const now = new Date();
        const oldestDate = new Date(now.getFullYear(), now.getMonth() - (monthsToFetch - 1), 1);
        const startDate = oldestDate.getTime();

        const userUpdatesRaw = await ctx.db
            .query('progressUpdates')
            .withIndex('by_createdBy_organization_date', q =>
                q
                    .eq('createdBy', userId)
                    .eq('organizationId', organizationId)
                    .gte('updateDate', startDate)
            )
            .take(LIST_LIMIT + 1);
        const isTruncated = userUpdatesRaw.length > LIST_LIMIT;
        const userUpdates = userUpdatesRaw.slice(0, LIST_LIMIT);

        const monthsData: { month: string; monthKey: string; count: number }[] = [];

        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = date.getTime();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();

            const count = userUpdates.filter(
                update => update.updateDate >= monthStart && update.updateDate < monthEnd
            ).length;

            const monthKey = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;

            monthsData.push({
                month: monthKey,
                monthKey,
                count,
            });
        }

        return { items: monthsData, isTruncated };
    },
});

export const getObjectivesWithMostProgress = queryWithRLS({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.object({
        items: v.array(
            v.object({
                id: v.id('objectives'),
                objective: v.string(),
                progress: v.number(),
                status: objectiveStatusValidator,
            })
        ),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        const MAX_QUERY_LIMIT = 100;
        const maxItems = Math.min(args.limit ?? PAGINATION.DASHBOARD_LIMIT, MAX_QUERY_LIMIT);

        if (!organizationId) {
            return { items: [], isTruncated: false };
        }

        const collaboratedObjectiveIds = await getCollaboratedObjectiveIdsForUser(
            ctx,
            ctx.userId,
            organizationId
        );

        const objectiveRows = await ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .take(LIST_LIMIT + 1);
        const isTruncated = objectiveRows.length > LIST_LIMIT;
        const objectives = objectiveRows
            .slice(0, LIST_LIMIT)
            .filter(
                objective =>
                    objective.deletedAt === undefined &&
                    canUserViewObjectiveInList(ctx, objective, collaboratedObjectiveIds)
            );

        const objectivesWithProgress = objectives
            .filter(objective => objective.status === 'active')
            .map(objective => {
                const progress = computeProgressPercent({
                    currentValue: objective.currentValue,
                    targetValue: objective.targetValue,
                    startValue: objective.startValue,
                });
                return {
                    id: objective._id,
                    objective: objective.title,
                    progress,
                    status: objective.status,
                };
            })
            .sort((a, b) => b.progress - a.progress)
            .slice(0, maxItems);

        return { items: objectivesWithProgress, isTruncated };
    },
});

export const getUpcomingDeadlines = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.object({
        items: v.array(
            v.object({
                id: v.id('objectives'),
                title: v.string(),
                deadline: v.number(),
                daysRemaining: v.number(),
                progress: v.number(),
            })
        ),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const organizationId = ctx.organizationId;
        const daysAhead = args.days ?? DASHBOARD.DEADLINE_DAYS_AHEAD;
        const now = Date.now();
        const futureLimit = now + daysAhead * TIME.DAY_MS;

        if (!organizationId) {
            return { items: [], isTruncated: false };
        }

        const collaboratedObjectiveIds = await getCollaboratedObjectiveIdsForUser(
            ctx,
            ctx.userId,
            organizationId
        );

        const objectiveRows = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .gt('deadline', now - 1)
                    .lt('deadline', futureLimit + 1)
            )
            .take(LIST_LIMIT + 1);
        const isTruncated = objectiveRows.length > LIST_LIMIT;
        const objectives = objectiveRows
            .slice(0, LIST_LIMIT)
            .filter(
                objective =>
                    objective.deletedAt === undefined &&
                    canUserViewObjectiveInList(ctx, objective, collaboratedObjectiveIds)
            );

        const upcomingDeadlines = objectives
            .filter(
                (objective): objective is typeof objective & { deadline: number } =>
                    objective.status === 'active' && Boolean(objective.deadline)
            )
            .map(objective => {
                const daysRemaining = Math.ceil((objective.deadline - now) / TIME.DAY_MS);
                return {
                    id: objective._id,
                    title: objective.title,
                    deadline: objective.deadline,
                    daysRemaining,
                    progress: computeProgressPercent({
                        currentValue: objective.currentValue,
                        targetValue: objective.targetValue,
                        startValue: objective.startValue,
                    }),
                };
            })
            .sort((a, b) => a.deadline - b.deadline);

        return { items: upcomingDeadlines, isTruncated };
    },
});

export const getRecentActivity = queryWithRLS({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.object({
        progressUpdatesCount: v.number(),
        objectivesCreatedCount: v.number(),
        objectivesCompletedCount: v.number(),
        periodDays: v.number(),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const userId = ctx.userId;
        const organizationId = ctx.organizationId;
        const daysBack = args.days ?? DASHBOARD.ACTIVITY_DAYS_BACK;
        const startDate = Date.now() - daysBack * TIME.DAY_MS;

        if (!organizationId) {
            return {
                progressUpdatesCount: 0,
                objectivesCreatedCount: 0,
                objectivesCompletedCount: 0,
                periodDays: daysBack,
                isTruncated: false,
            };
        }

        // Newest-first so the bounded read keeps the recently created/completed
        // objectives (the ones "recent activity" counts) in orgs past LIST_LIMIT.
        const organizationObjectivesPromise = ctx.db
            .query('objectives')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .order('desc')
            .take(LIST_LIMIT + 1);

        const recentUpdatesPromise = ctx.db
            .query('progressUpdates')
            .withIndex('by_createdBy_organization_date', q =>
                q
                    .eq('createdBy', userId)
                    .eq('organizationId', organizationId)
                    .gte('updateDate', startDate)
            )
            .take(101);

        const [organizationObjectiveRows, recentUpdateRows] = await Promise.all([
            organizationObjectivesPromise,
            recentUpdatesPromise,
        ]);
        const isTruncated =
            organizationObjectiveRows.length > LIST_LIMIT || recentUpdateRows.length > 100;
        const organizationObjectives = organizationObjectiveRows.slice(0, LIST_LIMIT);
        const recentUpdates = recentUpdateRows.slice(0, 100);

        const recentObjectives = organizationObjectives.filter(
            objective => objective.deletedAt === undefined && objective.createdAt >= startDate
        );
        const recentlyCompleted = organizationObjectives.filter(
            objective =>
                objective.deletedAt === undefined &&
                objective.status === 'completed' &&
                objective.updatedAt >= startDate
        );

        return {
            progressUpdatesCount: recentUpdates.length,
            objectivesCreatedCount: recentObjectives.length,
            objectivesCompletedCount: recentlyCompleted.length,
            periodDays: daysBack,
            isTruncated,
        };
    },
});
