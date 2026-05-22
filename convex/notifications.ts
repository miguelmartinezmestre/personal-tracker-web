import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { mutationWithRLS, queryWithRLS } from './rls';
import { runDeadlineNotificationsJob } from './jobs/notifications/deadlineNotifications';
import { markAllReadBatchJob } from './jobs/notifications/markAllRead';
import {
    assertCanCreateNotificationForObjective,
    assertCanMutateNotification,
    canReadObjectiveFromNotification,
} from './domain/notifications/delivery';
import { notificationTypeValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import type { NotificationType } from './utils/constants';

const NOTIFICATION_LIMIT = 100;
const OBJECTIVE_ID_LIMIT = 50;

export const getNotificationsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const results = await ctx.db
            .query('notifications')
            .withIndex('by_user_date', q => q.eq('userId', ctx.userId))
            .order('desc')
            .paginate(paginationOpts);

        return {
            page: results.page,
            continueCursor: results.continueCursor,
            isDone: results.isDone,
        };
    },
});

export const getObjectivesForNotifications = queryWithRLS({
    args: {
        objectiveIds: v.array(v.id('objectives')),
    },
    handler: async (ctx, args) => {
        if (args.objectiveIds.length > OBJECTIVE_ID_LIMIT) {
            throw new ConvexError('OBJECTIVE_ID_LIMIT_EXCEEDED');
        }

        const uniqueIds = [...new Set(args.objectiveIds)];
        const objectives = [];

        for (const objectiveId of uniqueIds) {
            const objective = await ctx.db.get(objectiveId);
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

export const getUnreadNotificationCount = queryWithRLS({
    args: {},
    handler: async ctx => {
        const unreadNotifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_read', q => q.eq('userId', ctx.userId).eq('read', false))
            .take(NOTIFICATION_LIMIT);

        return { count: unreadNotifications.length };
    },
});

export const createNotification = mutationWithRLS({
    args: {
        objective: v.id('objectives'),
        notificationType: notificationTypeValidator,
        notificationDate: v.optional(v.number()),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const objective = await ctx.db.get('objectives', args.objective);
        if (!objective) throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);

        await assertCanCreateNotificationForObjective(ctx, objective);

        const now = Date.now();
        const notificationDate = args.notificationDate ?? now;

        const id = await ctx.db.insert('notifications', {
            userId: ctx.userId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: args.notificationType as NotificationType,
            notificationDate,
            message: args.message,
            createdAt: now,
            updatedAt: now,
        });

        return await ctx.db.get('notifications', id);
    },
});

export const setNotificationRead = mutationWithRLS({
    args: {
        id: v.id('notifications'),
        read: v.boolean(),
    },
    handler: async (ctx, args) => {
        const notification = await ctx.db.get('notifications', args.id);

        if (!notification) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }

        assertCanMutateNotification(ctx, notification);

        await ctx.db.patch('notifications', args.id, { read: args.read, updatedAt: Date.now() });
        return await ctx.db.get('notifications', args.id);
    },
});

export const markAllReadBatch = internalMutation({
    args: {
        userId: v.id('user'),
        cursor: v.optional(v.union(v.string(), v.null())),
        totalProcessed: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await markAllReadBatchJob(ctx, args);
    },
});

export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    handler: async ctx => {
        await ctx.scheduler.runAfter(0, internal.notifications.markAllReadBatch, {
            userId: ctx.userId,
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
    handler: async (ctx, args) => {
        const notification = await ctx.db.get('notifications', args.id);

        if (!notification) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }

        assertCanMutateNotification(ctx, notification);

        await ctx.db.delete('notifications', args.id);
        return { success: true } as const;
    },
});

export const runDeadlineNotificationsCron = internalMutation({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),
        created: v.optional(v.number()),
        skipped: v.optional(v.number()),
        scannedSoFar: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await runDeadlineNotificationsJob(ctx, args);
    },
});
