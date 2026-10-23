import { v } from 'convex/values';

export const auditSeverityValidator = v.union(
    v.literal('info'),
    v.literal('warning'),
    v.literal('critical')
);

export const auditEntryValidator = v.object({
    id: v.id('auditLogs'),
    createdAt: v.number(),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.union(v.string(), v.null()),
    severity: auditSeverityValidator,
    userName: v.union(v.string(), v.null()),
    actorName: v.union(v.string(), v.null()),
    organizationId: v.union(v.id('organization'), v.null()),
    metadata: v.union(v.string(), v.null()),
});
