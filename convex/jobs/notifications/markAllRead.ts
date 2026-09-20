import { internal } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import type { MutationCtx } from '../../_generated/server';

const BATCH_SIZE = 100;

export async function markAllReadBatchJob(
    ctx: MutationCtx,
    args: {
        userId: Id<'user'>;
        organizationId: Id<'organization'>;
    }
): Promise<null> {
    // Do not advance a cursor over `read=false` while patching that same index
    // field. Process the current prefix repeatedly; each patched row leaves the
    // index, so the next invocation cannot skip unread notifications.
    const notifications = await ctx.db
        .query('notifications')
        .withIndex('by_user_organization_read', q =>
            q.eq('userId', args.userId).eq('organizationId', args.organizationId).eq('read', false)
        )
        .take(BATCH_SIZE);

    for (const notification of notifications) {
        await ctx.db.patch('notifications', notification._id, {
            read: true,
        });
    }

    if (notifications.length === BATCH_SIZE) {
        await ctx.scheduler.runAfter(0, internal.notifications.markAllReadBatch, {
            userId: args.userId,
            organizationId: args.organizationId,
        });
    }
    return null;
}
