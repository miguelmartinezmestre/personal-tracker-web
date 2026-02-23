import { v } from 'convex/values';
import { queryWithRLS, mutationWithRLS } from './rls';
import { internalMutation } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { paginationOptsValidator } from 'convex/server';
import { notificationTypeValidator } from './utils/validators';

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
        const userId = String(ctx.userId);
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
        const userId = String(ctx.userId);
        const unreadNotifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_read', q => q.eq('userId', userId).eq('read', false))
            .collect();

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
        const userId = String(ctx.userId);

        const objective = await ctx.db.get('objectives', args.objective);
        if (!objective) throw new Error('Objective not found');

        const role = String(ctx.role ?? 'user');
        const isAdmin = role === 'admin' || role === 'ADMIN';
        if (!isAdmin && objective.userId !== userId) {
            throw new Error('Not authorized to create notifications for this objective');
        }

        const now = Date.now();
        const notificationDate = args.notificationDate ?? now;

        const id = await ctx.db.insert('notifications', {
            userId: userId,
            organizationId: objective.organizationId,
            objective: args.objective,
            read: false,
            notificationType: args.notificationType as
                | 'deadline'
                | 'progress'
                | 'status'
                | 'achievement'
                | 'reminder',
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
        await ctx.db.patch('notifications', args.id, { read: args.read, updatedAt: Date.now() });
        return await ctx.db.get('notifications', args.id);
    },
});

export const markAllNotificationsRead = mutationWithRLS({
    args: {},
    handler: async ctx => {
        const userId = String(ctx.userId);
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user', q => q.eq('userId', userId))
            .collect();
        const now = Date.now();
        let updated = 0;

        for (const notification of notifications) {
            if (!notification.read) {
                await ctx.db.patch('notifications', notification._id, {
                    read: true,
                    updatedAt: now,
                });
                updated += 1;
            }
        }

        return { updated };
    },
});

export const deleteNotification = mutationWithRLS({
    args: {
        id: v.id('notifications'),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete('notifications', args.id);
        return 'Notification deleted successfully' as const;
    },
});

export const runDeadlineNotificationsCron = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();
        const dayStart = startOfDayUtc(now);
        const dayEnd = dayStart + DAY_MS;

        const objectives = (await ctx.db.query('objectives').collect()) as Doc<'objectives'>[];
        let created = 0;
        let skipped = 0;

        for (const objective of objectives) {
            if (!objective.deadline) continue;
            if (
                objective.status === 'completed' ||
                objective.status === 'archived' ||
                objective.status === 'deleted'
            )
                continue;

            const message = buildDeadlineMessage(objective, now, dayStart, dayEnd);
            if (!message) continue;

            const existing = await ctx.db
                .query('notifications')
                .withIndex('by_objective', q => q.eq('objective', objective._id))
                .filter(q =>
                    q.and(
                        q.eq(q.field('notificationType'), 'deadline'),
                        q.gte(q.field('notificationDate'), dayStart),
                        q.lt(q.field('notificationDate'), dayEnd)
                    )
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

        return { scanned: objectives.length, created, skipped };
    },
});
