import type { Infer } from 'convex/values';
import type { MutationCtx } from '../../_generated/server';
import { resolveActorUserId } from './privacy';
import type { auditSeverityValidator } from './validators';

export type AuditRecord = Record<string, string | number | boolean | null>;

export type AuditEntry = {
    action: string;
    resourceType: string;
    resourceId?: string;
    userId: string;
    organizationId?: string;
    severity: Infer<typeof auditSeverityValidator>;
    metadata?: { before?: AuditRecord; after?: AuditRecord };
};

export async function insertAuditLog(ctx: MutationCtx, entry: AuditEntry) {
    const actorUserId = (await ctx.auth.getUserIdentity())?.subject ?? null;
    const { before, after } = entry.metadata ?? {};

    await ctx.db.insert('auditLogs', {
        ...entry,
        actorUserId: resolveActorUserId(entry.userId, actorUserId),
        metadata: before || after ? { before, after } : undefined,
        createdAt: Date.now(),
    });
}
