import { internalMutation } from './platform/db/internalMutation';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { queryWithRLS } from './platform/rls/wrappers';
import { pruneAuditLogsOlderThanRetentionJob } from './jobs/audit/pruneAuditLogs';
import { paginatedAuditLogsValidator } from './utils/apiReturnValidators';
import { withPaginationLimits } from './utils/pagination';
export const getAuditLogs = queryWithRLS({
    args: {
        resourceType: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedAuditLogsValidator,
    handler: async (ctx, args) => {
        const resourceType = args.resourceType;
        const paginationOpts = withPaginationLimits(args.paginationOpts);
        if (resourceType !== undefined) {
            return await ctx.db
                .query('auditLogs')
                .withIndex('by_resourceType_createdAt', q => q.eq('resourceType', resourceType))
                .order('desc')
                .paginate(paginationOpts);
        }
        return await ctx.db
            .query('auditLogs')
            .withIndex('by_createdAt', q => q.gte('createdAt', 0))
            .order('desc')
            .paginate(paginationOpts);
    },
});
export const pruneAuditLogsOlderThanRetention = internalMutation({
    returns: v.null(),
    args: {},
    handler: async ctx => {
        await pruneAuditLogsOlderThanRetentionJob(ctx);
    },
});
