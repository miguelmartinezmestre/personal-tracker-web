import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

const BATCH_SIZE = 100;

export async function markAllReadBatchJob(
    ctx: MutationCtx,
    args: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
        cursor?: string | null;
        totalProcessed?: number;
    }
) {
    const now = Date.now();
    const totalProcessed = args.totalProcessed ?? 0;

    const page = await ctx.db
        .query('notifications')
        .withIndex('by_user_organization_read', q =>
            q.eq('userId', args.userId).eq('organizationId', args.organizationId).eq('read', false)
        )
        .paginate({
            numItems: BATCH_SIZE,
            cursor: args.cursor ?? null,
        });

    for (const notification of page.page) {
        await ctx.db.patch('notifications', notification._id, {
            read: true,
            updatedAt: now,
        });
    }

    const newTotal = totalProcessed + page.page.length;

    if (!page.isDone) {
        await ctx.scheduler.runAfter(0, internal.notifications.markAllReadBatch, {
            userId: args.userId,
            organizationId: args.organizationId,
            cursor: page.continueCursor,
            totalProcessed: newTotal,
        });
        return {
            status: 'in_progress',
            processedInBatch: page.page.length,
            totalProcessed: newTotal,
        };
    }

    return {
        status: 'completed',
        processedInBatch: page.page.length,
        totalProcessed: newTotal,
    };
}
