import { internal } from '../../_generated/api';
import type { MutationCtx } from '../../_generated/server';

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 256;

export async function pruneAuditLogsOlderThanRetentionJob(ctx: MutationCtx) {
    const cutoff = Date.now() - AUDIT_RETENTION_MS;

    const batch = await ctx.db
        .query('auditLogs')
        .withIndex('by_createdAt', q => q.lt('createdAt', cutoff))
        .take(PRUNE_BATCH);

    for (const row of batch) {
        await ctx.db.delete('auditLogs', row._id);
    }

    if (batch.length === PRUNE_BATCH) {
        await ctx.scheduler.runAfter(0, internal.auditLogs.pruneAuditLogsOlderThanRetention, {});
    }
}
