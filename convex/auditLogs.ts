import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { queryWithRLS } from './platform/rls/wrappers';
import { internalMutation } from './_generated/server';
import { pruneAuditLogsOlderThanRetentionJob } from './jobs/audit/pruneAuditLogs';
import { resolveActorUserId, sanitizeAuditMetadata } from './domain/audit/privacy';
import { auditSeverityValidator } from './utils/validators';

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
    handler: async (ctx, args) => {
        const resourceType = args.resourceType;

        if (resourceType !== undefined) {
            return await ctx.db
                .query('auditLogs')
                .withIndex('by_resourceType_createdAt', q => q.eq('resourceType', resourceType))
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

export const pruneAuditLogsOlderThanRetention = internalMutation({
    args: {},
    handler: async ctx => {
        return await pruneAuditLogsOlderThanRetentionJob(ctx);
    },
});

export const recordAuditLog = internalMutation({
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
