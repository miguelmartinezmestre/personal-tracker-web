import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { queryWithRLS } from './rls';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';

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

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 256;

export const pruneAuditLogsOlderThanRetention = internalMutation({
    args: {},
    handler: async ctx => {
        const cutoff = Date.now() - AUDIT_RETENTION_MS;

        const batch = await ctx.db
            .query('auditLogs')
            .withIndex('by_createdAt', q => q.lt('createdAt', cutoff))
            .take(PRUNE_BATCH);

        for (const row of batch) {
            await ctx.db.delete(row._id);
        }

        if (batch.length === PRUNE_BATCH) {
            await ctx.scheduler.runAfter(
                0,
                internal.auditLogs.pruneAuditLogsOlderThanRetention,
                {}
            );
        }
    },
});

export const recordAuditLog = internalMutation({
    args: {
        userId: v.id('user'),
        organizationId: v.id('organization'),
        action: v.string(),
        resourceType: v.string(),
        resourceId: v.optional(v.string()),
        severity: v.string(),
        metadata: v.optional(
            v.object({
                before: v.optional(auditMetadataSnapshot),
                after: v.optional(auditMetadataSnapshot),
                context: v.optional(v.string()),
            })
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('auditLogs', {
            userId: args.userId,
            organizationId: args.organizationId,
            action: args.action,
            resourceType: args.resourceType,
            resourceId: args.resourceId,
            metadata: args.metadata,
            severity: args.severity,
            createdAt: Date.now(),
        });
    },
});
