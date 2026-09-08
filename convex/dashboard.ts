import { queryWithRLS } from './platform/rls/wrappers';
import { internalMutation } from './platform/db/internalMutation';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { TIME, DASHBOARD, PAGINATION } from './utils/constants';
import { assertBoundedInteger, assertValidReferenceTimestamp } from './utils/queryTime';
import { computeProgressPercent } from './domain/objectives/metrics';
import { objectiveStatusValidator } from './utils/validators';
import { currentUtcCivilDay, toUtcCivilDay } from '../shared/civil-date';
import {
    countObjectives,
    countProgress,
    dashboardScope,
    rankedObjectives,
} from './domain/dashboard/read';
import {
    runDashboardBackfillBatch,
    resyncProgressBatch,
    startDashboardRebuild,
    cleanupDashboardGenerationsBatch,
} from './domain/dashboard/migration';

export const getDashboardStats = queryWithRLS({
    args: {},
    returns: v.object({
        totalObjectives: v.number(),
        completedObjectives: v.number(),
        pendingObjectives: v.number(),
        isTruncated: v.boolean(),
    }),
    handler: async ctx => {
        const scope = await dashboardScope(ctx);
        if (!scope) {
            return {
                totalObjectives: 0,
                completedObjectives: 0,
                pendingObjectives: 0,
                isTruncated: false,
            };
        }
        const [pendingObjectives, completedObjectives] = await Promise.all([
            countObjectives(ctx, scope.namespaces, {
                kind: 'status',
                lower: 0,
                upper: 1,
                status: 'active',
            }),
            countObjectives(ctx, scope.namespaces, {
                kind: 'status',
                lower: 0,
                upper: 1,
                status: 'completed',
            }),
        ]);
        return {
            totalObjectives: pendingObjectives + completedObjectives,
            completedObjectives,
            pendingObjectives,
            isTruncated: false,
        };
    },
});

export const getMonthlyProgress = queryWithRLS({
    args: { months: v.optional(v.number()), now: v.number() },
    returns: v.object({
        items: v.array(v.object({ month: v.string(), monthKey: v.string(), count: v.number() })),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const months = assertBoundedInteger(args.months ?? DASHBOARD.MONTHS_TO_SHOW, {
            min: DASHBOARD.MIN_MONTHS,
            max: DASHBOARD.MAX_MONTHS,
        });
        const scope = await dashboardScope(ctx);
        if (!scope) {
            return { items: [], isTruncated: false };
        }
        const now = new Date(Date.now());
        const items = await Promise.all(
            Array.from({ length: months }, async (_, index) => {
                const month = now.getUTCMonth() - months + 1 + index;
                const start = Date.UTC(now.getUTCFullYear(), month, 1);
                const end = Date.UTC(now.getUTCFullYear(), month + 1, 1);
                const date = new Date(start);
                const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
                return {
                    month: monthKey,
                    monthKey,
                    count: await countProgress(ctx, scope.progressNamespace, start, end),
                };
            })
        );
        return { items, isTruncated: false };
    },
});

export const getObjectivesWithMostProgress = queryWithRLS({
    args: { limit: v.optional(v.number()) },
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
        const limit = assertBoundedInteger(args.limit ?? PAGINATION.DASHBOARD_LIMIT, {
            min: 1,
            max: 100,
        });
        const scope = await dashboardScope(ctx);
        if (!scope) {
            return { items: [], isTruncated: false };
        }
        const result = await rankedObjectives(ctx, scope.namespaces, {
            kind: 'progress',
            limit,
            lower: 0,
            upper: 101,
        });
        return {
            items: result.documents.map(doc => ({
                id: doc._id,
                objective: doc.title,
                progress: computeProgressPercent(doc),
                status: doc.status,
            })),
            isTruncated: false,
        };
    },
});

export const getUpcomingDeadlines = queryWithRLS({
    args: { days: v.optional(v.number()), now: v.number(), limit: v.optional(v.number()) },
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
        assertValidReferenceTimestamp(args.now);
        const days = assertBoundedInteger(args.days ?? DASHBOARD.DEADLINE_DAYS_AHEAD, {
            min: DASHBOARD.MIN_DAYS,
            max: DASHBOARD.MAX_DEADLINE_DAYS,
        });
        const limit = assertBoundedInteger(args.limit ?? PAGINATION.DASHBOARD_LIMIT, {
            min: 1,
            max: 100,
        });
        const scope = await dashboardScope(ctx);
        if (!scope) {
            return { items: [], isTruncated: false };
        }
        const today = currentUtcCivilDay();
        const result = await rankedObjectives(ctx, scope.namespaces, {
            kind: 'deadline',
            limit,
            lower: today,
            upper: today + days * TIME.DAY_MS,
        });
        const items = result.documents.flatMap(doc =>
            doc.deadline === undefined
                ? []
                : [
                      {
                          id: doc._id,
                          title: doc.title,
                          deadline: toUtcCivilDay(doc.deadline),
                          daysRemaining: Math.round(
                              (toUtcCivilDay(doc.deadline) - today) / TIME.DAY_MS
                          ),
                          progress: computeProgressPercent(doc),
                      },
                  ]
        );
        return { items, isTruncated: result.hasMore };
    },
});

export const getRecentActivity = queryWithRLS({
    args: { days: v.optional(v.number()), now: v.number() },
    returns: v.object({
        progressUpdatesCount: v.number(),
        objectivesCreatedCount: v.number(),
        objectivesCompletedCount: v.number(),
        periodDays: v.number(),
        progressUpdatesTruncated: v.boolean(),
        objectivesCreatedTruncated: v.boolean(),
        objectivesCompletedTruncated: v.boolean(),
        isTruncated: v.boolean(),
    }),
    handler: async (ctx, args) => {
        assertValidReferenceTimestamp(args.now);
        const periodDays = assertBoundedInteger(args.days ?? DASHBOARD.ACTIVITY_DAYS_BACK, {
            min: DASHBOARD.MIN_DAYS,
            max: DASHBOARD.MAX_ACTIVITY_DAYS,
        });
        const scope = await dashboardScope(ctx);
        const start = Date.now() - periodDays * TIME.DAY_MS;
        const [progressUpdatesCount, objectivesCreatedCount, objectivesCompletedCount] = scope
            ? await Promise.all([
                  countProgress(ctx, scope.progressNamespace, start, Number.MAX_SAFE_INTEGER),
                  countObjectives(ctx, scope.namespaces, {
                      kind: 'created',
                      lower: start,
                      upper: Number.MAX_SAFE_INTEGER,
                  }),
                  countObjectives(ctx, scope.namespaces, {
                      kind: 'completed',
                      lower: start,
                      upper: Number.MAX_SAFE_INTEGER,
                  }),
              ])
            : [0, 0, 0];
        return {
            progressUpdatesCount,
            objectivesCreatedCount,
            objectivesCompletedCount,
            periodDays,
            progressUpdatesTruncated: false,
            objectivesCreatedTruncated: false,
            objectivesCompletedTruncated: false,
            isTruncated: false,
        };
    },
});

export const runDashboardBackfill = internalMutation({
    args: { migrationId: v.id('dashboardMigrations'), generation: v.number() },
    returns: v.null(),
    handler: runDashboardBackfillBatch,
});
export const cleanupDashboardGenerations = internalMutation({
    args: {
        organizationId: v.id('organization'),
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    returns: v.null(),
    handler: cleanupDashboardGenerationsBatch,
});
export const resyncObjectiveProgress = internalMutation({
    args: {
        resyncId: v.id('dashboardResyncs'),
        revision: v.number(),
        cursor: v.optional(v.union(v.string(), v.null())),
    },
    returns: v.null(),
    handler: resyncProgressBatch,
});
export const rebuildDashboard = internalMutation({
    args: { organizationId: v.id('organization') },
    returns: v.null(),
    handler: async (ctx, args): Promise<null> => {
        await startDashboardRebuild(ctx, args.organizationId);
        return null;
    },
});
export const rebuildAllDashboards = internalMutation({
    args: { cursor: v.optional(v.union(v.string(), v.null())) },
    returns: v.null(),
    handler: async (ctx, args): Promise<null> => {
        const page = await ctx.db
            .query('organization')
            .paginate({ numItems: 25, cursor: args.cursor ?? null });
        for (const organization of page.page) {
            await startDashboardRebuild(ctx, organization._id);
        }
        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.dashboard.rebuildAllDashboards, {
                cursor: page.continueCursor,
            });
        }
        return null;
    },
});
