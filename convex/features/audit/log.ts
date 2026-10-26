import type { Infer } from 'convex/values';
import { getAuthUserId } from 'kitcn/auth';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';
import { resolveActorUserId } from './privacy';
import type { auditSeverityValidator } from './validators';

export type AuditRecord = Record<string, string | number | boolean | null>;

export type AuditEntry = {
    action: string;
    resourceType: string;
    resourceId?: string;
    userId: Id<'user'>;
    organizationId?: Id<'organization'>;
    severity: Infer<typeof auditSeverityValidator>;
    metadata?: { before?: AuditRecord; after?: AuditRecord };
};

export async function insertAuditLog(ctx: MutationCtx, entry: AuditEntry) {
    const rawActorUserId = await getAuthUserId(ctx);
    const actorUserId = rawActorUserId ? ctx.db.normalizeId('user', rawActorUserId) : null;
    const { before, after } = entry.metadata ?? {};

    await ctx.db.insert('auditLogs', {
        ...entry,
        actorUserId: resolveActorUserId(entry.userId, actorUserId),
        metadata: before || after ? { before, after } : undefined,
        createdAt: Date.now(),
    });
}
