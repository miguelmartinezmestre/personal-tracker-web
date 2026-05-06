import { v, ConvexError } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { paginationOptsValidator } from 'convex/server';
import { notificationTypeValidator } from './utils/validators';
import { ERROR_CODES } from './utils/constants';
import type { NotificationType } from './utils/constants';
import { shouldSendDeadlineNotification } from './notificationPreferences';

const NOTIFICATION_LIMIT = 100;
const BATCH_SIZE = 100;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_SOON_DAYS = 3;

const startOfDayUtc = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
};

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

const buildDeadlineMessage = (
    objective: Doc<'objectives'>,
    now: number,
    dayStart: number,
    dayEnd: number
) => {
    if (!objective.deadline) return null;

    if (objective.deadline <= now) {
        const daysOverdue = Math.max(1, Math.ceil((now - objective.deadline) / DAY_MS));
        return `Objective "${objective.title}" is overdue by ${daysOverdue} day${
            daysOverdue === 1 ? '' : 's'
        } (due on ${formatDate(objective.deadline)}).`;
    }

    const isDueToday = objective.deadline >= dayStart && objective.deadline < dayEnd;
    if (isDueToday) {
        return `Objective "${objective.title}" is due today (${formatDate(objective.deadline)}).`;
    }

    const daysUntil = Math.ceil((objective.deadline - now) / DAY_MS);
    if (daysUntil > DEADLINE_SOON_DAYS) return null;

    return `Objective "${objective.title}" is due in ${daysUntil} day${
        daysUntil === 1 ? '' : 's'
    } (${formatDate(objective.deadline)}).`;
};

export const getNotificationsByUser = queryWithRLS({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { paginationOpts }) => {
        const userId = ctx.userId;
        const results = await ctx.db
            .query('notifications')
            .withIndex('by_user_date', q => q.eq('userId', userId))
            .order('desc')
            .paginate(paginationOpts);

        return {
            page: results.page,
            continueCursor: results.continueCursor,
            isDone: results.isDone,
        };
    },
});

export const getUnreadNotificationCount = queryWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;
        const unreadNotifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_read', q => q.eq('userId', userId).eq('read', false))
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
        const userId = ctx.userId;

        const objective = await ctx.db.get('objectives', args.objective);
        if (!objective) throw new ConvexError(ERROR_CODES.OBJECTIVE_NOT_FOUND);

        const role = ctx.role;
        const isAdmin = role === 'admin';
        const isOwner = objective.userId === userId;
        const isOrganizationMember =
            objective.scope === 'organization' &&
            Boolean(ctx.organizationId) &&
            objective.organizationId === ctx.organizationId;
        if (!isAdmin && !isOwner && !isOrganizationMember) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }

        const now = Date.now();
        const notificationDate = args.notificationDate ?? now;

        const id = await ctx.db.insert('notifications', {
            userId: userId,
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

        const role = ctx.role;
        const isAdmin = role === 'admin';
        const isOwner = notification.userId === ctx.userId;

        if (!isAdmin && !isOwner) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }

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
        const now = Date.now();
        const totalProcessed = args.totalProcessed ?? 0;

        const page = await ctx.db
            .query('notifications')
            .withIndex('by_user_read', q => q.eq('userId', args.userId).eq('read', false))
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
    },
});

export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    handler: async ctx => {
        const userId = ctx.userId;

        await ctx.scheduler.runAfter(0, internal.notifications.markAllReadBatch, {
            userId,
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

        const role = ctx.role;
        const isAdmin = role === 'admin';
        const isOwner = notification.userId === ctx.userId;

        if (!isAdmin && !isOwner) {
            throw new ConvexError(ERROR_CODES.NOT_AUTHORIZED_NOTIFICATION);
        }

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
        const now = Date.now();
        const dayStart = startOfDayUtc(now);
        const dayEnd = dayStart + DAY_MS;
        let created = args.created || 0;
        let skipped = args.skipped || 0;
        const scannedSoFar = args.scannedSoFar ?? 0;

        const page = await ctx.db
            .query('objectives')
            .withIndex('by_status', q => q.eq('status', 'active'))
            .paginate({
                numItems: BATCH_SIZE,
                cursor: args.cursor ?? null,
            });

        const objectives = page.page;

        for (const objective of objectives) {
            if (!objective.deadline) continue;

            const message = buildDeadlineMessage(objective, now, dayStart, dayEnd);
            if (!message) continue;

            const allowNotify = await shouldSendDeadlineNotification(ctx, objective.userId);
            if (!allowNotify) continue;

            const existing = await ctx.db
                .query('notifications')
                .withIndex('by_objective_type_date', q =>
                    q
                        .eq('objective', objective._id)
                        .eq('notificationType', 'deadline')
                        .gte('notificationDate', dayStart)
                        .lt('notificationDate', dayEnd)
                )
                .first();

            if (existing) {
                skipped += 1;
                continue;
            }

            await ctx.db.insert('notifications', {
                userId: objective.userId,
                organizationId: objective.organizationId,
                objective: objective._id,
                read: false,
                notificationType: 'deadline',
                notificationDate: now,
                message,
                createdAt: now,
                updatedAt: now,
            });

            created += 1;
        }

        const batchScanned = objectives.length;
        const totalScanned = scannedSoFar + batchScanned;

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.notifications.runDeadlineNotificationsCron, {
                cursor: page.continueCursor,
                created,
                skipped,
                scannedSoFar: totalScanned,
            });
            return {
                status: 'in_progress',
                processedInBatch: batchScanned,
                scannedSoFar: totalScanned,
                createdSoFar: created,
                skippedSoFar: skipped,
            };
        }

        return {
            status: 'completed',
            scanned: totalScanned,
            created,
            skipped,
        };
    },
});
