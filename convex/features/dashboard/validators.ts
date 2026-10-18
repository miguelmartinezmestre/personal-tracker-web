import { v } from 'convex/values';

export const categoryStatsValidator = v.object({
    categoryId: v.union(v.id('categories'), v.null()),
    name: v.union(v.string(), v.null()),
    color: v.union(v.string(), v.null()),
    total: v.number(),
    completed: v.number(),
    averageProgress: v.number(),
});
