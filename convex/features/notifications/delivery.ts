import type { Change } from 'convex-helpers/server/triggers';
import { internal } from '../../_generated/api';
import type { DataModel, Id } from '../../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { progressNotice } from './notices';
import type { NotificationType } from './validators';

export async function isNotificationEnabled(
    db: QueryCtx['db'],
    userId: Id<'user'>,
    type: NotificationType
): Promise<boolean> {
    const preferences = await db
        .query('notificationPreferences')
        .withIndex('by_user', q => q.eq('userId', userId))
        .unique();

    return preferences?.[type] ?? true;
}

export async function notifyObjectiveProgress(
    ctx: MutationCtx,
    change: Change<DataModel, 'objectives'>
) {
    if (!change.oldDoc || !change.newDoc || change.newDoc.deletedAt !== undefined) {
        return;
    }

    const notice = progressNotice(change.oldDoc, change.newDoc);

    if (notice) {
        await ctx.scheduler.runAfter(0, internal.notifications.notifyMembers, {
            organizationId: change.newDoc.organizationId,
            objectiveId: change.newDoc._id,
            notice,
            cursor: null,
        });
    }
}
