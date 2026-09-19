import { internalMutation } from './platform/db/internalMutation';
import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { mutationWithRLS, queryWithRLS } from './platform/rls/wrappers';
import { runDeadlineNotificationsJob } from './jobs/notifications/deadlineNotifications';
import { markAllReadBatchJob } from './jobs/notifications/markAllRead';
import { canReadObjectiveFromNotification } from './domain/notifications/delivery';
import { ERROR_CODES } from './utils/constants';
import {
    objectivesArrayValidator,
    paginatedNotificationsValidator,
} from './utils/apiReturnValidators';
import { notificationDocumentValidator } from './utils/documentValidators';
import { withInvalidCursorRetry } from './utils/pagination';
import { DEFAULT_PAGE_SIZE } from '../shared/pagination';
const OBJECTIVE_ID_LIMIT = 50;
const UNREAD_BADGE_LIMIT = 100;
const EMPTY_NOTIFICATION_PAGE = {
    page: [],
    continueCursor: '',
    isDone: true,
};
export const getNotificationsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    returns: paginatedNotificationsValidator,
    handler: async (ctx, { paginationOpts }) => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return EMPTY_NOTIFICATION_PAGE;
        }
        const results = await withInvalidCursorRetry(paginationOpts, retryPaginationOpts =>
            ctx.db
                .query('notifications')
                .withIndex('by_user_organization_date', q =>
                    q.eq('userId', ctx.userId).eq('organizationId', organizationId)
                )
                .order('desc')
                .paginate(retryPaginationOpts)
        );
        return {
            ...results,
            page: results.page,
        };
    },
});
export const getObjectivesForNotifications = queryWithRLS({
    args: {
        objectiveIds: v.array(v.id('objectives')),
    },
    returns: objectivesArrayValidator,
    handler: async (ctx, args) => {
        if (args.objectiveIds.length > OBJECTIVE_ID_LIMIT) {
            throw new ConvexError(ERROR_CODES.OBJECTIVE_ID_LIMIT_EXCEEDED);
        }
        const uniqueIds = [...new Set(args.objectiveIds)];
        const objectives = [];
        for (const objectiveId of uniqueIds) {
            const objective = await ctx.db.get('objectives', objectiveId);
            if (!objective) {
                continue;
            }
            if (canReadObjectiveFromNotification(ctx, objective)) {
                objectives.push(objective);
            }
        }
        return objectives;
    },
});
export const getNotificationOverview = queryWithRLS({
    args: {},
    returns: v.object({
        notifications: v.array(notificationDocumentValidator),
        unreadCount: v.number(),
        isUnreadTruncated: v.boolean(),
    }),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return { notifications: [], unreadCount: 0, isUnreadTruncated: false };
        }
        const [notifications, unreadRows] = await Promise.all([
            ctx.db
                .query('notifications')
                .withIndex('by_user_organization_date', q =>
                    q.eq('userId', ctx.userId).eq('organizationId', organizationId)
                )
                .order('desc')
                .take(DEFAULT_PAGE_SIZE),
            ctx.db
                .query('notifications')
                .withIndex('by_user_organization_read', q =>
                    q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('read', false)
                )
                .take(UNREAD_BADGE_LIMIT + 1),
        ]);
        return {
            notifications,
            unreadCount: Math.min(unreadRows.length, UNREAD_BADGE_LIMIT),
            isUnreadTruncated: unreadRows.length > UNREAD_BADGE_LIMIT,
        };
    },
});
export const setNotificationRead = mutationWithRLS({
    args: {
        id: v.id('notifications'),
        read: v.boolean(),
    },
    returns: v.union(notificationDocumentValidator, v.null()),
    handler: async (ctx, args) => {
        const notification = await ctx.db.get('notifications', args.id);
        if (!notification) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }
        await ctx.db.patch('notifications', args.id, { read: args.read, updatedAt: Date.now() });
        return await ctx.db.get('notifications', args.id);
    },
});
export const markAllReadBatch = internalMutation({
    returns: v.object({
        status: v.string(),
        processedInBatch: v.number(),
        totalProcessed: v.number(),
    }),
    args: {
        userId: v.id('user'),
        organizationId: v.id('organization'),
        cursor: v.optional(v.union(v.string(), v.null())),
        totalProcessed: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await markAllReadBatchJob(ctx, args);
    },
});
export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    returns: v.object({ status: v.string() }),
    handler: async ctx => {
        if (!ctx.organizationId) {
            throw new ConvexError(ERROR_CODES.NO_ACTIVE_ORG);
        }
        await ctx.scheduler.runAfter(0, internal.notifications.markAllReadBatch, {
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            cursor: null,
            totalProcessed: 0,
        });
        return { status: 'marking_started' };
    },
});
export const deleteNotification = mutationWithRLS({
    args: {
        id: v.id('notifications'),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, args) => {
        const notification = await ctx.db.get('notifications', args.id);
        if (!notification) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }
        await ctx.db.delete('notifications', args.id);
        return { success: true };
    },
});
export const runDeadlineNotificationsCron = internalMutation({
    returns: v.union(
        v.object({
            status: v.literal('in_progress'),
            processedInBatch: v.number(),
            scannedSoFar: v.number(),
            createdSoFar: v.number(),
            skippedSoFar: v.number(),
        }),
        v.object({
            status: v.literal('completed'),
            scanned: v.number(),
            created: v.number(),
            skipped: v.number(),
        })
    ),
    args: {
        runAt: v.optional(v.number()),
        cursor: v.optional(v.union(v.string(), v.null())),
        created: v.optional(v.number()),
        skipped: v.optional(v.number()),
        scannedSoFar: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await runDeadlineNotificationsJob(ctx, args);
    },
});
