import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { queryWithRLS } from './rls/wrappers';
import { progressPercent } from './objectiveRecords';

const DASHBOARD_OBJECTIVES_LIMIT = 500;
const DASHBOARD_CATEGORIES_LIMIT = 100;

const categoryStatsValidator = v.object({
    categoryId: v.union(v.id('categories'), v.null()),
    name: v.union(v.string(), v.null()),
    color: v.union(v.string(), v.null()),
    total: v.number(),
    completed: v.number(),
    averageProgress: v.number(),
});

type CategoryAccumulator = {
    categoryId: Id<'categories'> | null;
    total: number;
    completed: number;
    progressSum: number;
};

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
        truncated: v.boolean(),
    }),
    handler: async ctx => {
        if (!ctx.organizationId) {
            return {
                total: 0,
                active: 0,
                completed: 0,
                averageProgress: 0,
                categories: [],
                truncated: false,
            };
        }
        const organizationId = ctx.organizationId;
        const recent = await ctx.db
            .query('objectives')
            .withIndex('by_organization_createdAt', q => q.eq('organizationId', organizationId))
            .order('desc')
            .take(DASHBOARD_OBJECTIVES_LIMIT + 1);
        const objectives = recent.slice(0, DASHBOARD_OBJECTIVES_LIMIT);
        const categories = await ctx.db
            .query('categories')
            .withIndex('by_organization', q => q.eq('organizationId', organizationId))
            .take(DASHBOARD_CATEGORIES_LIMIT);
        const categoriesById = new Map(categories.map(category => [category._id, category]));

        let completed = 0;
        let progressSum = 0;
        const byCategory = new Map<Id<'categories'> | null, CategoryAccumulator>();
        for (const objective of objectives) {
            const percent = progressPercent(objective);
            const isCompleted = objective.status === 'completed';
            if (isCompleted) {
                completed += 1;
            }
            progressSum += percent;

            const categoryId =
                objective.categoryId && categoriesById.has(objective.categoryId)
                    ? objective.categoryId
                    : null;
            const entry = byCategory.get(categoryId) ?? {
                categoryId,
                total: 0,
                completed: 0,
                progressSum: 0,
            };
            entry.total += 1;
            entry.completed += isCompleted ? 1 : 0;
            entry.progressSum += percent;
            byCategory.set(categoryId, entry);
        }

        return {
            total: objectives.length,
            active: objectives.length - completed,
            completed,
            averageProgress: average(progressSum, objectives.length),
            categories: [...byCategory.values()]
                .map(entry => {
                    const category = entry.categoryId
                        ? categoriesById.get(entry.categoryId)
                        : undefined;
                    return {
                        categoryId: entry.categoryId,
                        name: category?.name ?? null,
                        color: category?.color ?? null,
                        total: entry.total,
                        completed: entry.completed,
                        averageProgress: average(entry.progressSum, entry.total),
                    };
                })
                .sort(
                    (a, b) =>
                        b.total - a.total ||
                        Number(a.name === null) - Number(b.name === null) ||
                        (a.name ?? '').localeCompare(b.name ?? '')
                ),
            truncated: recent.length > DASHBOARD_OBJECTIVES_LIMIT,
        };
    },
});
