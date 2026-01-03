import { queryWithRLS } from './rls';

export const getAuditLogs = queryWithRLS({
    args: {},
    handler: async ctx => {
        // Use an index to fetch the latest logs efficiently (no full table scan/sort).
        return await ctx.db
            .query('auditLogs')
            .withIndex('by_createdAt', q => q.gte('createdAt', 0))
            .order('desc')
            .take(100);
    },
});
