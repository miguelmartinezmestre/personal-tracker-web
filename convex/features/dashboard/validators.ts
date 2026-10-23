import { v } from 'convex/values';

export const categoryStatsValidator = v.object({
    categoryId: v.union(v.id('categories'), v.null()),
    name: v.union(v.string(), v.null()),
    color: v.union(v.string(), v.null()),
    total: v.number(),
    completed: v.number(),
    averageProgress: v.number(),
});

export const objectiveRankingEntryValidator = v.object({
    id: v.id('objectives'),
    title: v.string(),
    status: v.union(v.literal('active'), v.literal('completed')),
    progressPercent: v.number(),
});

export const upcomingDeadlineValidator = v.object({
    id: v.id('objectives'),
    title: v.string(),
    deadline: v.number(),
    dueSoonDays: v.number(),
    progressPercent: v.number(),
});
