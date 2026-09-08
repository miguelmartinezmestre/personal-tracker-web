import { internalMutation } from './platform/db/internalMutation';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalQueryWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { pruneAuditLogsOlderThanRetentionJob } from './jobs/audit/pruneAuditLogs';
import { resolveActorUserId, sanitizeAuditMetadata } from './domain/audit/privacy';
import { paginatedAuditLogsValidator } from './utils/apiReturnValidators';
import { auditSeverityValidator } from './utils/validators';
import { withPaginationLimits } from './utils/pagination';
const auditPrimitive = v.union(v.string(), v.number(), v.boolean(), v.null());
const auditValueLevel1 = v.union(
    auditPrimitive,
    v.array(auditPrimitive),
    v.record(v.string(), auditPrimitive)
);
const auditMetadataSnapshot = v.union(
    auditValueLevel1,
    v.array(auditValueLevel1),
    v.record(v.string(), auditValueLevel1)
);
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
export const getAuditLogsByResource = internalQueryWithRLS({
    args: {
        resourceType: v.string(),
        resourceId: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedAuditLogsValidator,
    handler: async (ctx, args) => {
        const paginationOpts = withPaginationLimits(args.paginationOpts);
        return await ctx.db
            .query('auditLogs')
            .withIndex('by_resourceType_resourceId', q =>
                q.eq('resourceType', args.resourceType).eq('resourceId', args.resourceId)
            )
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
export const recordAuditLog = internalMutation({
    returns: v.null(),
    args: {
        userId: v.id('user'),
        actorUserId: v.optional(v.id('user')),
        organizationId: v.id('organization'),
        action: v.string(),
        resourceType: v.string(),
        resourceId: v.optional(v.string()),
        severity: auditSeverityValidator,
        metadata: v.optional(
            v.object({
                before: v.optional(auditMetadataSnapshot),
                after: v.optional(auditMetadataSnapshot),
                context: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        if (!(await ctx.db.get('organization', args.organizationId))) {
            return null;
        }
        const metadata = sanitizeAuditMetadata(args.resourceType, args.metadata);
        await ctx.db.insert('auditLogs', {
            userId: args.userId,
            actorUserId: resolveActorUserId(args.userId, args.actorUserId),
            organizationId: args.organizationId,
            action: args.action,
            resourceType: args.resourceType,
            resourceId: args.resourceId,
            metadata,
            severity: args.severity,
            createdAt: Date.now(),
        });
    },
});
