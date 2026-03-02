import { v } from 'convex/values';
import { queryWithRLS } from './rls';

export const getAuditLogs = queryWithRLS({
    args: {
        resourceType: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        const resourceType = args.resourceType;

        if (resourceType !== undefined) {
            return await ctx.db
                .query('auditLogs')
                .withIndex('by_resourceType', q => q.eq('resourceType', resourceType))
                .order('desc')
                .take(limit);
        }

        return await ctx.db
            .query('auditLogs')
            .withIndex('by_createdAt', q => q.gte('createdAt', 0))
            .order('desc')
            .take(limit);
    },
});

export const getAuditLogsByResource = queryWithRLS({
    args: {
        resourceType: v.string(),
        resourceId: v.string(),
    },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query('auditLogs')
            .withIndex('by_resourceType', q => q.eq('resourceType', args.resourceType))
            .order('desc')
            .collect();

        return logs.filter(log => log.resourceId === args.resourceId);
    },
});
