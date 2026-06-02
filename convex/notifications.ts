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

const OBJECTIVE_ID_LIMIT = 50;
const EMPTY_NOTIFICATION_PAGE = {
    page: [],
    continueCursor: '',
    isDone: true,
};

export const getNotificationsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return EMPTY_NOTIFICATION_PAGE;
        }

        const results = await ctx.db
            .query('notifications')
            .withIndex('by_user_organization_date', q =>
                q.eq('userId', ctx.userId).eq('organizationId', organizationId)
            )
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
    returns: v.object({ count: v.number() }),
    handler: async ctx => {
        const organizationId = ctx.organizationId;
        if (!organizationId) {
            return { count: 0 };
        }

        let count = 0;
        let cursor: string | null = null;
        let isDone = false;
        const BATCH_SIZE = 1000;

        while (!isDone) {
            const page = await ctx.db
                .query('notifications')
                .withIndex('by_user_organization_read', q =>
                    q
                        .eq('userId', ctx.userId)
                        .eq('organizationId', organizationId)
                        .eq('read', false)
                )
                .paginate({ numItems: BATCH_SIZE, cursor });

            count += page.page.length;
            isDone = page.isDone;
            cursor = page.continueCursor;
        }

        return { count };
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

        assertCanMutateNotification(ctx, notification);

        await ctx.db.delete('notifications', args.id);
        return { success: true };
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
