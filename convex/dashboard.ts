import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { queryWithRLS } from './rls/wrappers';
import { objectiveStats } from './objectiveStats';

const categoryStatsValidator = v.object({
    categoryId: v.union(v.id('categories'), v.null()),
    name: v.union(v.string(), v.null()),
    color: v.union(v.string(), v.null()),
    total: v.number(),
    completed: v.number(),
    averageProgress: v.number(),
});

function average(sum: number, count: number): number {
    return count === 0 ? 0 : Math.round(sum / count);
}

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
        const queries = [
            { namespace },
            { namespace, bounds: { prefix: ['completed'] as ['completed'] } },
            ...categories.flatMap(category => [
                {
                    namespace,
                    bounds: { prefix: ['active', category._id] as ['active', Id<'categories'>] },
                },
                {
                    namespace,
                    bounds: {
                        prefix: ['completed', category._id] as ['completed', Id<'categories'>],
                    },
                },
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
                categoryId: category._id as Id<'categories'> | null,
                name: category.name as string | null,
                color: category.color as string | null,
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
                .filter(entry => entry.total > 0)
                .map(({ progressSum: sum, ...entry }) => ({
                    ...entry,
                    averageProgress: average(sum, entry.total),
                }))
                .sort(
                    (a, b) =>
                        b.total - a.total ||
                        Number(a.name === null) - Number(b.name === null) ||
                        (a.name ?? '').localeCompare(b.name ?? '')
                ),
        };
    },
});
