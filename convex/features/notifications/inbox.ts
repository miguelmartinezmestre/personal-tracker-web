import type { MutationCtx } from '../../_generated/server';
import { NOTIFICATION_BATCH_SIZE } from './constants';

export async function markReadBatch(db: MutationCtx['db'], userId: string, organizationId: string) {
    const unread = await db
        .query('notifications')
        .withIndex('by_user_organization_read', q =>
            q.eq('userId', userId).eq('organizationId', organizationId).eq('read', false)
        )
        .take(NOTIFICATION_BATCH_SIZE);

    for (const notification of unread) {
        await db.patch('notifications', notification._id, { read: true });
    }

    return unread.length === NOTIFICATION_BATCH_SIZE;
}
