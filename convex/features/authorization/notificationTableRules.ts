import type { Doc } from '../../_generated/dataModel';
import { rlsDeny, rlsWhen, type RlsHelpers, type RlsInsertDoc } from './rlsHelpers';

type QueryLike = RlsHelpers['ctx'];

// Each user reaches only their own; notifications are written by internal functions alone.
export function notificationTableRules({ userId, isActiveOrganization }: RlsHelpers) {
    const isOwnInActiveOrganization = (_ctx: QueryLike, notification: Doc<'notifications'>) =>
        rlsWhen(
            notification.userId === userId && isActiveOrganization(notification.organizationId)
        );

    return {
        notifications: {
            read: isOwnInActiveOrganization,
            insert: rlsDeny,
            modify: isOwnInActiveOrganization,
        },
        notificationPreferences: {
            read: (_ctx: QueryLike, preferences: Doc<'notificationPreferences'>) =>
                rlsWhen(preferences.userId === userId),
            insert: (_ctx: QueryLike, preferences: RlsInsertDoc<'notificationPreferences'>) =>
                rlsWhen(preferences.userId === userId),
            modify: (_ctx: QueryLike, preferences: Doc<'notificationPreferences'>) =>
                rlsWhen(preferences.userId === userId),
        },
    };
}
