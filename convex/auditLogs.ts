import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { queryWithRLS } from './rls';

export const getAuditLogs = queryWithRLS({
    args: {
        resourceType: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const resourceType = args.resourceType;

        if (resourceType !== undefined) {
            return await ctx.db
                .query('auditLogs')
                .withIndex('by_resourceType', q => q.eq('resourceType', resourceType))
                .order('desc')
                .paginate(args.paginationOpts);
        }

        return await ctx.db
            .query('auditLogs')
            .withIndex('by_createdAt', q => q.gte('createdAt', 0))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const getAuditLogsByResource = queryWithRLS({
    args: {
        resourceType: v.string(),
        resourceId: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('auditLogs')
            .withIndex('by_resourceType_resourceId', q =>
                q.eq('resourceType', args.resourceType).eq('resourceId', args.resourceId)
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
