import type { Doc } from './_generated/dataModel';
import {
    ACTIVITY_DAYS,
    ACTIVITY_ROWS_LIMIT,
    MONTHLY_ENTRIES_LIMIT,
    MONTHS_SHOWN,
    UPCOMING_DEADLINES,
} from './features/dashboard/constants';
import {
    average,
    emptyTotals,
    trashedObjectives,
    visibilityGroups,
    visiblePrivateObjectives,
    type StatsQuery,
} from './features/dashboard/stats';
import {
    categoryStatsValidator,
    objectiveRankingEntryValidator,
    upcomingDeadlineValidator,
} from './features/dashboard/validators';
import { objectiveRanking, objectiveStats } from './features/objectives/stats';
import { DEFAULT_DUE_SOON_DAYS } from './features/objectives/constants';
import { MAX_PAGE_ITEMS } from './shared/pagination';
import { DAY_MS } from './features/objectives/rules';
import { ERROR_CODES } from './shared/errorCodes';
import { progressPercent } from './features/objectives/records';
import { queryWithRLS } from './features/authorization/wrappers';
import { isOrganizationAdminRole } from './features/organizations/roles';
import { ConvexError, v } from 'convex/values';

export const getDashboardStats = queryWithRLS({
    args: {},
    returns: v.object({
        total: v.number(),
        active: v.number(),
        completed: v.number(),
        averageProgress: v.number(),
        categories: v.array(categoryStatsValidator),
    }),
    handler: async ctx => {
        if (!ctx.organizationId) {
            return { total: 0, active: 0, completed: 0, averageProgress: 0, categories: [] };
        }

        const namespace = ctx.organizationId;
        const categories: Doc<'categories'>[] = [];

        for await (const category of ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', namespace))) {
            categories.push(category);
        }

        // Owner and admins see every objective, so the private ones also come from the aggregate.
        const isManager = isOrganizationAdminRole(ctx.memberRole);
        const visibilities = isManager ? [true, false] : [true];

        // Per visibility: the whole set, the completed ones, then active and completed per category.
        const queries: StatsQuery[] = visibilities.flatMap(visible => [
            { namespace, bounds: { prefix: [false, visible] } },
            { namespace, bounds: { prefix: [false, visible, 'completed'] } },
            ...categories.flatMap((category): StatsQuery[] => [
                { namespace, bounds: { prefix: [false, visible, 'active', category._id] } },
                { namespace, bounds: { prefix: [false, visible, 'completed', category._id] } },
            ]),
        ]);

        const [counts, sums] = await Promise.all([
            objectiveStats.countBatch(ctx, queries),
            objectiveStats.sumBatch(ctx, queries),
        ]);

        const overall = emptyTotals();
        const byCategory = new Map(categories.map(category => [category._id, emptyTotals()]));
        const stride = 2 + categories.length * 2;

        visibilities.forEach((_visible, set) => {
            const at = (index: number) => ({
                count: counts[set * stride + index] ?? 0,
                sum: sums[set * stride + index] ?? 0,
            });

            overall.total += at(0).count;
            overall.completed += at(1).count;
            overall.progressSum += at(0).sum;

            categories.forEach((category, index) => {
                const active = at(2 + index * 2);
                const completed = at(3 + index * 2);
                const totals = byCategory.get(category._id) ?? emptyTotals();

                totals.total += active.count + completed.count;
                totals.completed += completed.count;
                totals.progressSum += active.sum + completed.sum;
            });
        });

        if (!isManager) {
            for (const objective of await visiblePrivateObjectives(ctx.db, namespace, ctx.userId)) {
                const totals = [overall];
                const categoryTotals = objective.categoryId && byCategory.get(objective.categoryId);

                if (categoryTotals) {
                    totals.push(categoryTotals);
                }

                for (const entry of totals) {
                    entry.total += 1;
                    entry.completed += objective.status === 'completed' ? 1 : 0;
                    entry.progressSum += progressPercent(objective);
                }
            }
        }

        const stats = categories.map(category => ({
            categoryId: category._id,
            name: category.name,
            color: category.color,
            ...(byCategory.get(category._id) ?? emptyTotals()),
        }));

        // Objectives without a category, or pointing at one that no longer exists, are the rest.
        const uncategorized = {
            categoryId: null,
            name: null,
            color: null,
            total: overall.total - stats.reduce((sum, entry) => sum + entry.total, 0),
            completed: overall.completed - stats.reduce((sum, entry) => sum + entry.completed, 0),
            progressSum:
                overall.progressSum - stats.reduce((sum, entry) => sum + entry.progressSum, 0),
        };

        return {
            total: overall.total,
            active: overall.total - overall.completed,
            completed: overall.completed,
            averageProgress: average(overall.progressSum, overall.total),
            categories: [...stats, uncategorized]
                .flatMap(({ progressSum: sum, ...entry }) =>
                    entry.total > 0
                        ? [{ ...entry, averageProgress: average(sum, entry.total) }]
                        : []
                )
                .sort(
                    (a, b) =>
                        b.total - a.total ||
                        Number(a.name === null) - Number(b.name === null) ||
                        (a.name ?? '').localeCompare(b.name ?? '')
                ),
        };
    },
});

export const getTopObjectives = queryWithRLS({
    args: { limit: v.number() },
    returns: v.array(objectiveRankingEntryValidator),
    handler: async (ctx, args) => {
        if (!ctx.organizationId) {
            return [];
        }

        if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > MAX_PAGE_ITEMS) {
            throw new ConvexError(ERROR_CODES.VALIDATION_ERROR);
        }

        const namespace = ctx.organizationId;
        const groups = await visibilityGroups(ctx, namespace);
        const candidates = [...groups.privateObjectives];

        for (const visible of groups.memberCanView) {
            const { page } = await objectiveRanking.paginate(ctx, {
                namespace,
                bounds: { prefix: [false, visible] },
                order: 'desc',
                pageSize: args.limit,
            });

            for (const item of page) {
                const objective = await ctx.db.get('objectives', item.id);

                if (objective) {
                    candidates.push(objective);
                }
            }
        }

        const unique = new Map(candidates.map(objective => [objective._id, objective]));

        return [...unique.values()]
            .map(objective => ({
                id: objective._id,
                title: objective.title,
                status: objective.status,
                progressPercent: progressPercent(objective),
            }))
            .sort((a, b) => b.progressPercent - a.progressPercent)
            .slice(0, args.limit);
    },
});

export const getMonthlyUpdates = queryWithRLS({
    args: {},
    returns: v.array(v.object({ month: v.string(), count: v.number() })),
    handler: async ctx => {
        const now = new Date();

        // Progress dates are calendar days stored as UTC midnight, so months are UTC months too.
        const months = Array.from({ length: MONTHS_SHOWN }, (_, index) =>
            new Date(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_SHOWN + 1 + index, 1)
            )
                .toISOString()
                .slice(0, 7)
        );

        const counts = new Map(months.map(month => [month, 0]));

        if (ctx.organizationId) {
            const organizationId = ctx.organizationId;
            const since = Date.parse(`${months[0]}-01T00:00:00Z`);

            // Row-level security leaves out the entries of objectives the user can't see.
            const entries = await ctx.db
                .query('progressUpdates')
                .withIndex('by_organization_date', q =>
                    q.eq('organizationId', organizationId).gte('updateDate', since)
                )
                .take(MONTHLY_ENTRIES_LIMIT);

            const inTrash = await trashedObjectives(ctx.db, entries);

            for (const entry of entries) {
                const month = new Date(entry.updateDate).toISOString().slice(0, 7);

                if (!inTrash.has(entry.objective) && counts.has(month)) {
                    counts.set(month, (counts.get(month) ?? 0) + 1);
                }
            }
        }

        return months.map(month => ({ month, count: counts.get(month) ?? 0 }));
    },
});

// Active objectives by deadline, overdue first; the client turns dates into days left (P7).
export const getUpcomingDeadlines = queryWithRLS({
    args: {},
    returns: v.array(upcomingDeadlineValidator),
    handler: async ctx => {
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            return [];
        }

        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_status_deadline', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .eq('status', 'active')
                    .gte('deadline', 0)
            )
            .take(UPCOMING_DEADLINES);

        return objectives.map(objective => ({
            id: objective._id,
            title: objective.title,
            deadline: objective.deadline ?? 0,
            dueSoonDays: objective.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS,
            progressPercent: progressPercent(objective),
        }));
    },
});

// What happened in the visible objectives over the last seven days (decision 18).
export const getRecentActivity = queryWithRLS({
    args: {},
    returns: v.object({ created: v.number(), updates: v.number(), completed: v.number() }),
    handler: async ctx => {
        const organizationId = ctx.organizationId;

        if (!organizationId) {
            return { created: 0, updates: 0, completed: 0 };
        }

        const since = Date.now() - ACTIVITY_DAYS * DAY_MS;

        const created = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_createdAt', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .gte('createdAt', since)
            )
            .take(ACTIVITY_ROWS_LIMIT);

        const completed = await ctx.db
            .query('objectives')
            .withIndex('by_organization_deletedAt_completedAt', q =>
                q
                    .eq('organizationId', organizationId)
                    .eq('deletedAt', undefined)
                    .gte('completedAt', since)
            )
            .take(ACTIVITY_ROWS_LIMIT);

        const entries = await ctx.db
            .query('progressUpdates')
            .withIndex('by_organization_createdAt', q =>
                q.eq('organizationId', organizationId).gte('createdAt', since)
            )
            .take(ACTIVITY_ROWS_LIMIT);

        const inTrash = await trashedObjectives(ctx.db, entries);

        return {
            created: created.length,
            updates: entries.filter(entry => !inTrash.has(entry.objective)).length,
            completed: completed.length,
        };
    },
});
