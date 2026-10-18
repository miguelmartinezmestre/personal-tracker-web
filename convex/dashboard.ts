import type { Doc } from './_generated/dataModel';
import { average } from './features/dashboard/stats';
import { categoryStatsValidator } from './features/dashboard/validators';
import { objectiveStats } from './features/objectives/stats';
import { queryWithRLS } from './features/authorization/wrappers';
import { v } from 'convex/values';

type StatsQuery = Parameters<typeof objectiveStats.countBatch>[1][number];

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

        // Query 0 is the whole organization, then one active and one completed query per category.
        const queries: StatsQuery[] = [
            { namespace },
            { namespace, bounds: { prefix: ['completed'] } },
            ...categories.flatMap((category): StatsQuery[] => [
                { namespace, bounds: { prefix: ['active', category._id] } },
                { namespace, bounds: { prefix: ['completed', category._id] } },
            ]),
        ];

        const [counts, sums] = await Promise.all([
            objectiveStats.countBatch(ctx, queries),
            objectiveStats.sumBatch(ctx, queries),
        ]);

        const total = counts[0] ?? 0;
        const completed = counts[1] ?? 0;
        const progressSum = sums[0] ?? 0;

        const stats = categories.map((category, index) => {
            const active = 2 + index * 2;

            return {
                categoryId: category._id,
                name: category.name,
                color: category.color,
                total: (counts[active] ?? 0) + (counts[active + 1] ?? 0),
                completed: counts[active + 1] ?? 0,
                progressSum: (sums[active] ?? 0) + (sums[active + 1] ?? 0),
            };
        });

        // Objectives without a category, or pointing at one that no longer exists, are the rest.
        const uncategorized = {
            categoryId: null,
            name: null,
            color: null,
            total: total - stats.reduce((sum, entry) => sum + entry.total, 0),
            completed: completed - stats.reduce((sum, entry) => sum + entry.completed, 0),
            progressSum: progressSum - stats.reduce((sum, entry) => sum + entry.progressSum, 0),
        };

        return {
            total,
            active: total - completed,
            completed,
            averageProgress: average(progressSum, total),
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
