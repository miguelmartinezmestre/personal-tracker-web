import { ConvexError, v } from 'convex/values';
import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { ERROR_CODES } from './shared/errorCodes';
import { withNextPageCheck, withPaginationLimits } from './shared/pagination';
import { mutationWithRLS, queryWithRLS } from './features/authorization/wrappers';
import { objectiveAccess } from './features/objectives/access';
import { requireOrganizationId } from './features/objectives/records';
import { DAY_MS, startOfUtcDay } from './features/objectives/rules';
import {
    DEFAULT_PREFERENCES,
    NOTIFICATION_BATCH_SIZE,
    UNREAD_COUNT_LIMIT,
} from './features/notifications/constants';
import { isNotificationEnabled } from './features/notifications/delivery';
import { markReadBatch } from './features/notifications/inbox';
import { deadlineNotice } from './features/notifications/notices';
import {
    noticeValidator,
    notificationPreferencesValidator,
    notificationValidator,
} from './features/notifications/validators';

// Newest first, only the user's own in the active organization (REQ-NOTIFICACIONES-003).
export const listNotifications = queryWithRLS({
    args: { paginationOpts: paginationOptsValidator },
    returns: paginationResultValidator(notificationValidator),
    handler: async (ctx, args) => {
        const organizationId = requireOrganizationId(ctx.organizationId);

        const result = await ctx.db
            .query('notifications')
            .withIndex('by_user_organization_date', q =>
                q.eq('userId', ctx.userId).eq('organizationId', organizationId)
            )
            .order('desc')
            .paginate(withPaginationLimits(args.paginationOpts));

        return await withNextPageCheck(
            ctx.db,
            {
                table: 'notifications',
                index: 'by_user_organization_date',
                prefix: [ctx.userId, organizationId],
                indexKey: doc => [doc.userId, doc.organizationId, doc.notificationDate],
                paginationOpts: args.paginationOpts,
            },
            result,
            result.page.map(notification => ({
                id: notification._id,
                type: notification.notificationType,
                date: notification.notificationDate,
                read: notification.read,
                objectiveId: notification.objective ?? null,
                messageKey: notification.messageKey,
                messageParams: notification.messageParams,
                message: notification.message,
            }))
        );
    },
});

export const countUnreadNotifications = queryWithRLS({
    args: {},
    returns: v.number(),
    handler: async ctx => {
        if (!ctx.organizationId) {
            return 0;
        }

        const organizationId = ctx.organizationId;

        const unread = await ctx.db
            .query('notifications')
            .withIndex('by_user_organization_read', q =>
                q.eq('userId', ctx.userId).eq('organizationId', organizationId).eq('read', false)
            )
            .take(UNREAD_COUNT_LIMIT);

        return unread.length;
    },
});

export const setNotificationRead = mutationWithRLS({
    args: { id: v.id('notifications'), read: v.boolean() },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (!(await ctx.db.get('notifications', args.id))) {
            throw new ConvexError(ERROR_CODES.NOTIFICATION_NOT_FOUND);
        }

        await ctx.db.patch('notifications', args.id, { read: args.read });

        return null;
    },
});

// The first 100 at once and the rest in the background (INH-NOT-06).
export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    returns: v.null(),
    handler: async ctx => {
        const organizationId = requireOrganizationId(ctx.organizationId);

        if (await markReadBatch(ctx.db, ctx.userId, organizationId)) {
            await ctx.scheduler.runAfter(0, internal.notifications.continueMarkAllRead, {
                userId: ctx.userId,
                organizationId,
            });
        }

        return null;
    },
});

export const continueMarkAllRead = internalMutation({
    args: { userId: v.id('user'), organizationId: v.id('organization') },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (await markReadBatch(ctx.db, args.userId, args.organizationId)) {
            await ctx.scheduler.runAfter(0, internal.notifications.continueMarkAllRead, args);
        }

        return null;
    },
});

export const deleteNotification = mutationWithRLS({
    args: { id: v.id('notifications') },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (!(await ctx.db.get('notifications', args.id))) {
            throw new ConvexError(ERROR_CODES.NOTIFICATION_NOT_FOUND);
        }

        await ctx.db.delete('notifications', args.id);

        return null;
    },
});

export const getNotificationPreferences = queryWithRLS({
    args: {},
    returns: notificationPreferencesValidator,
    handler: async ctx => {
        const preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', ctx.userId))
            .unique();

        if (!preferences) {
            return DEFAULT_PREFERENCES;
        }

        const { deadline, progress, status, achievement } = preferences;

        return { deadline, progress, status, achievement };
    },
});

export const updateNotificationPreferences = mutationWithRLS({
    args: notificationPreferencesValidator.fields,
    returns: v.null(),
    handler: async (ctx, args) => {
        const preferences = await ctx.db
            .query('notificationPreferences')
            .withIndex('by_user', q => q.eq('userId', ctx.userId))
            .unique();

        if (preferences) {
            await ctx.db.patch('notificationPreferences', preferences._id, args);
        } else {
            await ctx.db.insert('notificationPreferences', { ...args, userId: ctx.userId });
        }

        return null;
    },
});

// Everyone in the organization, or only those who can see the objective, in batches of 100.
export const notifyMembers = internalMutation({
    args: {
        organizationId: v.id('organization'),
        objectiveId: v.optional(v.id('objectives')),
        notice: noticeValidator,
        cursor: v.union(v.string(), v.null()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const objective = args.objectiveId
            ? await ctx.db.get('objectives', args.objectiveId)
            : null;

        if (args.objectiveId && (!objective || objective.deletedAt !== undefined)) {
            return null;
        }

        const members = await ctx.db
            .query('member')
            .withIndex('organizationId', q => q.eq('organizationId', args.organizationId))
            .paginate({ numItems: NOTIFICATION_BATCH_SIZE, cursor: args.cursor });

        const now = Date.now();

        for (const member of members.page) {
            const actor = {
                userId: member.userId,
                organizationId: args.organizationId,
                memberRole: member.role,
            };

            if (
                (!objective || (await objectiveAccess(ctx.db, actor, objective)).canView) &&
                (await isNotificationEnabled(ctx.db, member.userId, args.notice.notificationType))
            ) {
                await ctx.db.insert('notifications', {
                    ...args.notice,
                    userId: member.userId,
                    organizationId: args.organizationId,
                    objective: objective?._id,
                    read: false,
                    notificationDate: now,
                });
            }
        }

        if (!members.isDone) {
            await ctx.scheduler.runAfter(0, internal.notifications.notifyMembers, {
                ...args,
                cursor: members.continueCursor,
            });
        }

        return null;
    },
});

// Daily, from crons.ts; at most one deadline notice per objective and day (INH-NOT-02).
export const sendDeadlineNotifications = internalMutation({
    args: { today: v.optional(v.number()), cursor: v.optional(v.string()) },
    returns: v.null(),
    handler: async (ctx, args) => {
        const today = args.today ?? startOfUtcDay(Date.now());

        // The due-soon warning has no upper bound, so every upcoming deadline is read, 100 at a time.
        const objectives = await ctx.db
            .query('objectives')
            .withIndex('by_status_deletedAt_deadline', q =>
                q
                    .eq('status', 'active')
                    .eq('deletedAt', undefined)
                    .gte('deadline', today - DAY_MS)
            )
            .paginate({ numItems: NOTIFICATION_BATCH_SIZE, cursor: args.cursor ?? null });

        for (const objective of objectives.page) {
            const notice = deadlineNotice(objective, today);

            if (!notice) {
                continue;
            }

            const sentToday = await ctx.db
                .query('notifications')
                .withIndex('by_objective_type_date', q =>
                    q
                        .eq('objective', objective._id)
                        .eq('notificationType', 'deadline')
                        .gte('notificationDate', today)
                )
                .first();

            if (!sentToday) {
                await ctx.scheduler.runAfter(0, internal.notifications.notifyMembers, {
                    organizationId: objective.organizationId,
                    objectiveId: objective._id,
                    notice,
                    cursor: null,
                });
            }
        }

        if (!objectives.isDone) {
            await ctx.scheduler.runAfter(0, internal.notifications.sendDeadlineNotifications, {
                today,
                cursor: objectives.continueCursor,
            });
        }

        return null;
    },
});
